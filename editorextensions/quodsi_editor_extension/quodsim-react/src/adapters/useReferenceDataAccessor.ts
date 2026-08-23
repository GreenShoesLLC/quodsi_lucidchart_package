// quodsim-react/src/adapters/useReferenceDataAccessor.ts
//
// Studio's shared requirement editor (RequirementField, ResourceRequirementModal,
// ResourceRequirementsEditor) reads `resources / resourceRequirements /
// activities` from a ModelStateAccessor and writes with
// accessor.updateModel({ resourceRequirements }). In Lucid those three
// collections already reach the model panel through the selection-driven
// `referenceData` prop, and the custom list is persisted through the existing
// RESOURCE_REQUIREMENTS_UPDATE route -- so this adapter wraps exactly those.
//
// It is NOT the model-root projection route (useModelRootSource): that
// projection carries no resources/requirements/activities today, and adding
// them is Lucid global-resources Part 2's job. Spec:
// docs/superpowers/specs/2026-08-22-lucid-requirement-editor-adoption-design.md
//
// Contract highlights:
//  - updateModel resolves only when the host has replied RESULT (the sender
//    is a confirmed round trip), which is what keeps Studio's
//    flush-then-repoint ordering without a flushModelImmediate.
//  - Before sending, the list is filtered by isPlainAutoRequirement — it
//    strips PLAIN auto-requirements; custom overrides stored under an auto
//    id are preserved. An id colliding with a resource id is NOT by itself
//    proof of "plain auto": the extension explicitly supports storing a
//    custom override under an auto id (ModelDefinitionPageBuilder.
//    loadAndMergeResourceRequirements merges "custom overrides auto by
//    matching ID"), so only a *structurally* plain auto-requirement is
//    dropped; anything else with a colliding id is sent through as the
//    override it is.
//  - After a successful write the snapshot OVERLAYS the sent list until the
//    next referenceData prop lands, so the picker never flashes
//    "(missing requirement: …)" between the RESULT and the selection refresh.
//  - updateShape now also routes routing-tab edits: connectors / generators /
//    entities / states are projected onto the snapshot alongside the
//    existing three collections, and updateShape(shapeId, type, patch)
//    persists either through a host-registered shape writer (Lucid's own
//    shape-data write, no envelope) or through Task 2's ELEMENT_UPDATE
//    sender, overlaying the patch onto the matching element either way so
//    the view reflects the change immediately -- the host editor's autosave
//    is a separate ELEMENT_UPDATE that never refreshes referenceData. See
//    spec docs/superpowers/specs/2026-08-22-lucid-routing-tab-design.md.

import { useEffect, useRef } from 'react'
import type { EditorReferenceData, ISerializedResourceRequirement } from '@quodsi/lucid-shared'
import { RequirementMode } from '@quodsi/lucid-shared'
import type { ModelStateAccessor, ModelStateSnapshot } from 'quodsi_studio/platforms/shared'

export type ReferenceDataSenders = {
  updateResourceRequirements: (list: ISerializedResourceRequirement[]) => Promise<void>
  /** Optional: callers that never write shapes (e.g. the requirement editors) omit it. */
  updateElement?: (elementId: string, type: string, data: Record<string, unknown>) => Promise<void>
}

/** A host-implemented writer for a specific shape's own shape-data (no envelope, no round trip). */
export type ShapeWriter = (patch: Record<string, unknown>) => void | Promise<void>

export type ReferenceDataAccessorOptions = {
  /** shapeId -> writer, registered by the caller for shapes it owns directly (e.g. the selected source). */
  shapeWriters?: Record<string, ShapeWriter>
}

type RequirementRecord = { id: string; name: string; rootClause?: unknown }

type RootClauseShape = {
  mode?: string
  requests?: Array<{ resourceId?: string; quantity?: number }>
  clauses?: unknown[]
}

/**
 * True when `entry` is structurally the plain, single-resource auto-requirement
 * `ResourceRequirement.createForSingleResource` mints for `resource`: a
 * REQUIRE_ALL root clause with exactly one request against `resource.id` at
 * quantity 1 (or omitted, its sparse-wire default), no sub-clauses, and
 * `entry.name === resource.name`.
 *
 * An id colliding with a resource id is NOT by itself proof of this shape —
 * the extension explicitly supports storing a CUSTOM override under an auto
 * id (`ModelDefinitionPageBuilder.loadAndMergeResourceRequirements` merges
 * "custom overrides auto by matching ID … custom takes precedence", and
 * Lucid's ModelEditor save path deliberately minted such records). Stripping
 * every id-colliding entry — the bug this predicate fixes — silently
 * reverts that override on the next save: the extension re-mints the plain
 * auto on reload once the override is gone from `q_res_requirements`.
 *
 * `requests`/`clauses` are treated as absent-means-empty (the sparse wire
 * omits them at their defaults), matching `ISerializedRequirementClause`.
 */
export function isPlainAutoRequirement(
  entry: RequirementRecord,
  resource: { id: string; name: string },
): boolean {
  if (entry.id !== resource.id) return false
  if (entry.name !== resource.name) return false
  const clause = entry.rootClause as RootClauseShape | undefined
  if (!clause) return false
  if (clause.mode !== RequirementMode.REQUIRE_ALL) return false
  if ((clause.clauses ?? []).length !== 0) return false
  const requests = clause.requests ?? []
  if (requests.length !== 1) return false
  const [request] = requests
  if (request.resourceId !== entry.id) return false
  if (request.quantity !== undefined && request.quantity !== 1) return false
  return true
}

export type ReferenceDataSource = {
  accessor: ModelStateAccessor
  setReferenceData(next: EditorReferenceData | undefined): void
}

type ElementRecord = { id: string } & Record<string, unknown>

export function createReferenceDataAccessor(
  initial: EditorReferenceData | undefined,
  getSenders: () => ReferenceDataSenders,
  getOptions?: () => ReferenceDataAccessorOptions,
): ReferenceDataSource {
  let referenceData = initial
  let overlay: RequirementRecord[] | null = null
  let elementOverlays: Record<string, Record<string, unknown>> = {} // id -> merged patch
  let saveStatus: ModelStateSnapshot['saveStatus'] = 'idle'
  let saveError: string | null = null
  const listeners = new Set<() => void>()

  const withOverlay = <T extends ElementRecord>(list: T[] | undefined): T[] =>
    (list ?? []).map((el) => (elementOverlays[el.id] ? { ...el, ...elementOverlays[el.id] } : el))

  const build = (): ModelStateSnapshot => ({
    modelDefinition: {
      resources: referenceData?.resources ?? [],
      resourceRequirements: overlay ?? (referenceData?.resourceRequirements as unknown as RequirementRecord[] | undefined) ?? [],
      activities: withOverlay(referenceData?.activities as ElementRecord[] | undefined),
      generators: withOverlay(referenceData?.generators as unknown as ElementRecord[] | undefined),
      connectors: withOverlay(referenceData?.connectors as unknown as ElementRecord[] | undefined),
      entities: referenceData?.entities ?? [],
      states: referenceData?.states ?? [],
    } as unknown as ModelStateSnapshot['modelDefinition'],
    saveStatus,
    saveError,
  })
  let snapshot = build()
  const notify = () => {
    snapshot = build()
    listeners.forEach((l) => l())
  }

  const accessor: ModelStateAccessor = {
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    getSnapshot: () => snapshot,
    async updateModel(patch) {
      const unhandled = Object.keys(patch).filter((k) => k !== 'resourceRequirements')
      if (unhandled.length > 0) {
        throw new Error(`useReferenceDataAccessor.updateModel: no persistence path for key(s): ${unhandled.join(', ')}`)
      }
      const list = (patch.resourceRequirements as RequirementRecord[] | undefined) ?? []
      const resourcesById = new Map((referenceData?.resources ?? []).map((r) => [r.id, r]))
      const customs = list
        .filter((r) => {
          const resource = resourcesById.get(r.id)
          return !resource || !isPlainAutoRequirement(r, resource)
        })
        .map((r) => ({ id: r.id, name: r.name, rootClause: r.rootClause })) as ISerializedResourceRequirement[]
      saveStatus = 'saving'
      saveError = null
      notify()
      try {
        await getSenders().updateResourceRequirements(customs)
        overlay = list
        saveStatus = 'saved'
        notify()
      } catch (err) {
        saveStatus = 'failed'
        saveError = err instanceof Error ? err.message : String(err)
        notify()
        throw err
      }
    },
    async updateShape(shapeId, type, patch) {
      const writer = getOptions?.().shapeWriters?.[shapeId]
      if (writer) {
        await writer(patch)
        // The host editor persists via its own autosave (an ELEMENT_UPDATE,
        // which never refreshes referenceData) -- overlay so the view shows
        // the change now.
        elementOverlays = { ...elementOverlays, [shapeId]: { ...(elementOverlays[shapeId] ?? {}), ...patch } }
        notify()
        return
      }
      if (type !== 'Connector' && type !== 'Activity' && type !== 'Generator') {
        throw new Error(`useReferenceDataAccessor.updateShape: no persistence path for type ${type}`)
      }
      const send = getSenders().updateElement
      if (!send) throw new Error('useReferenceDataAccessor.updateShape: no updateElement sender configured')
      saveStatus = 'saving'
      saveError = null
      notify()
      try {
        await send(shapeId, type, patch)
        elementOverlays = { ...elementOverlays, [shapeId]: { ...(elementOverlays[shapeId] ?? {}), ...patch } }
        saveStatus = 'saved'
        notify()
      } catch (err) {
        saveStatus = 'failed'
        saveError = err instanceof Error ? err.message : String(err)
        notify()
        throw err
      }
    },
  }

  return {
    accessor,
    setReferenceData(next) {
      if (next === referenceData) return
      referenceData = next
      overlay = null
      elementOverlays = {}
      notify()
    },
  }
}

export function useReferenceDataAccessor(
  referenceData: EditorReferenceData | undefined,
  senders: ReferenceDataSenders,
  options?: ReferenceDataAccessorOptions,
): ModelStateAccessor {
  const sendersRef = useRef(senders)
  sendersRef.current = senders
  const optionsRef = useRef(options)
  optionsRef.current = options
  const sourceRef = useRef<ReferenceDataSource | null>(null)
  if (!sourceRef.current) {
    sourceRef.current = createReferenceDataAccessor(referenceData, () => sendersRef.current, () => optionsRef.current ?? {})
  }
  // Prop → source in an effect, not during render: setReferenceData notifies
  // useSyncExternalStore subscribers, which must not happen mid-render.
  // Previous-value compare lives inside setReferenceData (StrictMode-safe).
  useEffect(() => {
    sourceRef.current!.setReferenceData(referenceData)
  }, [referenceData])
  return sourceRef.current.accessor
}
