// quodsi_lucidchart_package/editorextensions/quodsi_editor_extension/quodsim-react/src/adapters/useModelRootSource.ts
//
// React-side cache for the model-root projection the shared panels read.
//
// The extension owns the authoritative model and lives in a DIFFERENT JS
// realm, reachable only by postMessage -- so `deps.getModelDefinition` cannot
// call ModelManager. It reads this cache, which the host refreshes by pushing
// MODEL_ROOT_SNAPSHOT (unsolicited after every successful write, and on
// request when a consumer first mounts).
//
// REFERENCE STABILITY IS LOAD-BEARING. createLucidModelStateAccessor's
// getSnapshot caches on this returning the SAME object between real changes,
// and React calls getSnapshot on every render -- returning a fresh object each
// time throws "The result of getSnapshot should be cached".
//
// TWO DELIVERABLES IN THIS FILE:
//   1. createModelRootSource(transport) -- a pure, testable factory. No
//      knowledge of window/postMessage/React; it just tracks a cached
//      projection and forwards writes through the injected `transport`.
//   2. useModelRootSource() -- the React hook that wires that factory to
//      THIS package's actual messaging idiom (mint-your-own-correlation-id,
//      one-shot window.postMessage RPC), the same pattern usePortalSender
//      and useUpgradeInterestSender use for host round-trips that need a
//      resolved/rejected Promise rather than a Redux-broadcast update.
//      MODEL_ROOT_SNAPSHOT is NOT one-shot -- it arrives unsolicited after
//      every write in addition to replying to MODEL_ROOT_REQUEST -- so unlike
//      those two senders, the snapshot listener here is never torn down
//      until the hook unmounts.

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { v4 as uuid } from 'uuid'
import {
  EnvelopeBase,
  EnvelopeMessageType,
  MessageSource,
  ModelRootProjection,
} from '@quodsi/lucid-shared'
import { useMessaging } from '../messaging/MessageProvider'
import {
  createLucidModelStateAccessor,
  type LucidModelStateAccessorDeps,
  type ModelStateAccessor,
} from './LucidModelStateAccessor'

export type ModelRootTransport = {
  /** Send a model-root patch to the host. Resolves when the host confirms. */
  send(patch: Record<string, unknown>): Promise<void>
  /** Ask the host for a fresh snapshot. Optional -- absent in unit tests. */
  request?(): void
  /**
   * Persist a shape-scoped patch (e.g. the arrival-pattern editor modal's
   * GeneratorPatternTab volume slider, or its fork-on-edit linking, both via
   * accessor.updateShape). Optional -- absent in unit tests that only
   * exercise the model-root half; when absent, deps.save throws rather than
   * silently no-opping (see createModelRootSource's own comment).
   */
  saveShape?(shapeId: string, type: string, patch: Record<string, unknown>): Promise<void>
}

// Markers the HOST stamps onto each projected resource row at build time
// (which shape claims it, that shape's label, which lane). They describe the
// canvas, not the record, so no patch a panel sends ever carries them.
const TRANSIENT_RESOURCE_KEYS = ['shapeId', 'shapeLabel', 'laneRef'] as const

export function createModelRootSource(transport: ModelRootTransport) {
  const listeners = new Set<() => void>()
  let projection: ModelRootProjection | null = null

  function acceptSnapshot(next: ModelRootProjection): void {
    // Replace the reference wholesale. Never mutate in place: the accessor's
    // cache compares by identity, so an in-place edit would be invisible.
    projection = next
    listeners.forEach((l) => l())
  }

  /**
   * OPTIMISTIC ECHO. Folds an outgoing model-root patch into the cached
   * projection immediately, before the host has seen it.
   *
   * Without this, a controlled input whose value is read out of the projection
   * and whose onChange calls accessor.updateModel is a full postMessage round
   * trip per keystroke: React re-renders the input with the PRE-keystroke
   * value the instant the change event settles, and only the eventual
   * MODEL_ROOT_SNAPSHOT catches it up. Type "Radiology Technician" at speed
   * into Studio's ResourceBasicTab name field and characters drop and reorder.
   *
   * `resources` merges PER ROW BY ID rather than replacing rows, so the
   * transient link markers above -- which exist only on the host's projection
   * and never on a patch -- survive the echo; otherwise the Resources tab's
   * link column flickers to "no shape" for the length of a round trip. Every
   * other key is replaced wholesale: they carry no host-only fields.
   *
   * The projection object is always REBUILT, never mutated: the accessor's
   * getSnapshot cache compares by identity. The authoritative
   * MODEL_ROOT_SNAPSHOT that follows replaces whatever this guessed.
   */
  function echoPatch(patch: Record<string, unknown>): void {
    // No snapshot yet means nothing to echo into -- and nothing is rendering
    // off the projection either, so the first snapshot is the whole answer.
    if (!projection) return

    const current = projection as unknown as Record<string, unknown>
    const next: Record<string, unknown> = { ...current }

    for (const [key, value] of Object.entries(patch)) {
      if (key === 'resources' && Array.isArray(value)) {
        const cachedById = new Map<string, Record<string, unknown>>()
        for (const row of (current.resources as Array<Record<string, unknown>> | undefined) ?? []) {
          if (row) cachedById.set(String(row.id), row)
        }
        next.resources = value.map((row: Record<string, unknown>) => {
          const prev = row ? cachedById.get(String(row.id)) : undefined
          if (!prev) return row
          const merged: Record<string, unknown> = { ...prev, ...row }
          for (const k of TRANSIENT_RESOURCE_KEYS) {
            // Covers the spread's blind spot: an explicit `shapeId: undefined`
            // on the patch row overwrites the cached marker with undefined,
            // and that still means "the patch did not carry it", not "clear
            // it" -- only the host can clear a marker.
            if (merged[k] === undefined && prev[k] !== undefined) merged[k] = prev[k]
          }
          return merged
        })
      } else {
        next[key] = value
      }
    }

    projection = next as unknown as ModelRootProjection
    listeners.forEach((l) => l())
  }

  const deps: LucidModelStateAccessorDeps = {
    getModelDefinition: () => projection as unknown as Record<string, unknown> | null,

    onModelChanged: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },

    // Forwards to transport.saveShape, which the React hook below wires to
    // the SAME ELEMENT_UPDATE route (same envelope type, same host handler
    // ElementOpsHandler.handleElementUpdate, same StorageAdapter merge)
    // GeneratorEditor's own field edits already use -- see that hook's own
    // comment. Until Task 10 review round 2 this threw unconditionally
    // ("wire deps.save to the existing element-update route instead");
    // GeneratorPatternTab's volume input and fork-linking both call
    // accessor.updateShape, and both were silently rejecting. Round 3
    // upgraded the wiring again: saveShape now AWAITS the real
    // ELEMENT_UPDATE_RESULT confirmation (round 2's version resolved the
    // instant the message was sent), because a caller that needs to
    // sequence a shape write before a model-root write -- GeneratorEditor's
    // PATTERN mode-switch does, see its own comment -- needs deps.save to
    // mean "durably persisted", not "message dispatched". A transport with
    // no saveShape wired (e.g. a bare unit test) still fails loudly,
    // matching updateModel's own "no saveModel dependency configured"
    // posture -- never a silent no-op.
    save: async (shapeId, type, patch) => {
      if (!transport.saveShape) {
        throw new Error(
          'useModelRootSource: no saveShape transport configured -- this ' +
          'shape-scoped patch was NOT persisted'
        )
      }
      await transport.saveShape(shapeId, type, patch)
    },

    // Synchronous shape lookup, served ENTIRELY from the cached projection.
    // Lucid's shapes live in the extension realm, so there is no way to ask
    // the host "what is blk-1 called?" and answer inside a synchronous
    // `ShapeInfoLike | null` return -- but there is no need to: every
    // resources[] row already carries the shapeId it is claimed by and that
    // shape's label, stamped at projection-build time (Plan 2b Tasks 3/7).
    //
    // SCOPE IS DELIBERATELY RESOURCE-ONLY. The single consumer today is
    // ResourcesEditor's link-status column
    // (`accessor.getShapeInfo?.(shapeId)?.name ?? shapeId`), and the
    // projection carries link markers for nothing else. A shape id that no
    // resource row claims therefore returns null rather than a fabricated
    // descriptor -- the caller's own `?? shapeId` fallback then shows the raw
    // id, which is honest, where an invented name would not be.
    //
    // masterName / quodsiData are null and is1D is false because the
    // projection does not carry them; they exist on ShapeInfoLike for
    // Visio's classification flow (classifyShape / removeClassification),
    // neither of which this host wires up.
    getShapeInfo: (shapeId: string) => {
      const row = projection?.resources?.find((r) => r.shapeId === shapeId)
      if (!row) return null
      const label = row.shapeLabel ?? shapeId
      return {
        shapeId,
        name: label,
        text: label,
        masterName: null,
        is1D: false,
        quodsiType: 'Resource',
        quodsiData: null,
      }
    },

    // Forwarded VERBATIM. Never branch on keys here -- see the module doc on
    // LucidModelStateAccessor for the bug this prevents. (echoPatch above
    // does branch on keys, but only over the LOCAL cache; what goes on the
    // wire is untouched.)
    saveModel: (patch: Record<string, unknown>) => {
      echoPatch(patch)
      return transport.send(patch)
    },
  }

  return {
    deps,
    acceptSnapshot,
    request: () => transport.request?.(),
  }
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

// Panel type (the `?view=` the iframe was opened with) -> the `source` this
// realm stamps on outgoing envelopes.
//
// `pattern` and `schedule` were missing here, so both modal realms fell
// through to 'model-iframe'. That is invisible today ONLY because
// RoutingModal.messageFromFrame re-stamps `envelope.source` from the channel
// role before routing, which is the actual guarantee and must stay -- do not
// "simplify" it away on the strength of this map. But a compile-time union
// disagreeing with a runtime list is exactly the shape of the bug documented
// at the top of lucid-shared's envelope.ts (MESSAGE_SOURCES): the union
// accepted 'pattern-iframe' while the validator did not, and every message
// from the pattern modal was silently dropped. Keep the two in agreement.
const SOURCE_BY_PANEL: Record<string, MessageSource> = {
  auth: 'auth-iframe',
  model: 'model-iframe',
  results: 'results-iframe',
  pattern: 'pattern-iframe',
  schedule: 'schedule-iframe',
}

// Generous but bounded: a model-root write is a local ModelManager mutation
// plus a re-validate, not a network call, so this is a safety net against a
// dropped message rather than a tuning knob for a slow round-trip.
const MODEL_ROOT_UPDATE_TIMEOUT_MS = 30_000

/**
 * Wires createModelRootSource to this package's postMessage transport and
 * hands back a ready-to-use ModelStateAccessor plus the current projection.
 *
 * Consumption (Task 10, inside GeneratorEditor's Lucid host component):
 *   const { accessor, projection } = useModelRootSource()
 *   if (!projection) return <Loading />   // no snapshot has arrived yet
 *   return <GeneratorEditor shapeId={...} accessor={accessor} />
 *
 * `projection` is for gating/rendering the raw arrivalPatterns/generators
 * lists directly if a consumer needs them without going through the generic
 * ModelStateAccessor snapshot's `modelDefinition` cast. `accessor` is what
 * gets threaded into shared components, which read it via
 * useSyncExternalStore(accessor.subscribe, accessor.getSnapshot) themselves.
 */
export function useModelRootSource(): {
  accessor: ModelStateAccessor
  projection: ModelRootProjection | null
} {
  const { app } = useMessaging()
  const source: MessageSource = SOURCE_BY_PANEL[app.panelType || 'model'] ?? 'model-iframe'

  // Lazy-init once per component instance. createModelRootSource has no side
  // effects (it doesn't send anything), so re-running this check on every
  // render -- including React 18 StrictMode's double-invoked first render --
  // is safe: the second check just finds sourceRef.current already set.
  const sourceRef = useRef<ReturnType<typeof createModelRootSource> | null>(null)
  if (!sourceRef.current) {
    const transport: ModelRootTransport = {
      send(patch) {
        return new Promise<void>((resolve, reject) => {
          if (!window.parent) {
            reject(new Error('No parent window to send model-root update to'))
            return
          }

          const correlationId = uuid()
          let timeoutId: ReturnType<typeof setTimeout> | undefined

          const handler = (event: MessageEvent) => {
            const msg = event.data
            if (
              msg?.id === correlationId &&
              msg?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT
            ) {
              window.removeEventListener('message', handler)
              if (timeoutId !== undefined) clearTimeout(timeoutId)
              const data = (msg.data || {}) as { success?: boolean; errorMessage?: string }
              if (data.success) {
                resolve()
              } else {
                reject(new Error(data.errorMessage || 'Model-root update failed'))
              }
            }
          }

          window.addEventListener('message', handler)
          timeoutId = setTimeout(() => {
            window.removeEventListener('message', handler)
            reject(new Error('Model-root update timed out'))
          }, MODEL_ROOT_UPDATE_TIMEOUT_MS)

          const envelope: EnvelopeBase = {
            id: correlationId,
            type: EnvelopeMessageType.MODEL_ROOT_UPDATE,
            source,
            target: 'host',
            version: '1.0',
            data: { patch },
          }
          window.parent.postMessage(envelope, '*')
        })
      },

      request() {
        if (!window.parent) return
        const envelope: EnvelopeBase = {
          id: uuid(),
          type: EnvelopeMessageType.MODEL_ROOT_REQUEST,
          source,
          target: 'host',
          version: '1.0',
          data: {},
        }
        window.parent.postMessage(envelope, '*')
      },

      // Real confirmed round trip -- mirrors send()'s MODEL_ROOT_UPDATE
      // handling immediately above (and usePortalSender's one-shot RPC
      // idiom): mint a correlation id, await the matching
      // ELEMENT_UPDATE_RESULT, resolve/reject on success/failure. This is
      // NOT the same JS call updateElementData makes (which never surfaces
      // its envelope id, so it can't be awaited this way) -- but it IS the
      // same wire-level route: identical ELEMENT_UPDATE envelope shape,
      // handled by the identical host handler
      // (ElementOpsHandler.handleElementUpdate -> ModelManager.saveElementData
      // -> StorageAdapter.updateElementData, which merges rather than
      // clobbers -- verified in Task 10 review round 2).
      //
      // On confirmed success, request() a fresh snapshot. This is the fix
      // for the "split-brain projection" finding (Task 10 review round 3):
      // ELEMENT_UPDATE never triggers a MODEL_ROOT_SNAPSHOT push on its own
      // (only MODEL_ROOT_REQUEST and the post-write push after
      // MODEL_ROOT_UPDATE do), and that post-write push is built by
      // buildModelRootProjection CONCURRENTLY with an in-flight shape write
      // -- so a caller that fires both writes in parallel can have the
      // model-root snapshot land BEFORE the shape write's arrivalPatternId
      // reaches storage, permanently missing the link. Re-requesting here
      // only fires once THIS shape write is confirmed durable, so a caller
      // that awaits saveShape before issuing its own model-root write (see
      // GeneratorEditor's PATTERN mode-switch handler) is guaranteed a
      // projection that reflects both halves before making its next
      // lifecycle decision.
      saveShape(shapeId, type, patch) {
        return new Promise<void>((resolve, reject) => {
          if (!window.parent) {
            reject(new Error('No parent window to send element update to'))
            return
          }

          const correlationId = uuid()
          let timeoutId: ReturnType<typeof setTimeout> | undefined

          const handler = (event: MessageEvent) => {
            const msg = event.data
            if (
              msg?.id === correlationId &&
              msg?.type === EnvelopeMessageType.ELEMENT_UPDATE_RESULT
            ) {
              window.removeEventListener('message', handler)
              if (timeoutId !== undefined) clearTimeout(timeoutId)
              const data = (msg.data || {}) as { success?: boolean; errorMessage?: string }
              if (data.success) {
                resolve()
                // Fire-and-forget from THIS function's point of view -- the
                // caller's own await is already satisfied; the fresh
                // snapshot arrives via the persistent listener below like
                // any other push.
                transport.request?.()
              } else {
                reject(new Error(data.errorMessage || 'Element update failed'))
              }
            }
          }

          window.addEventListener('message', handler)
          timeoutId = setTimeout(() => {
            window.removeEventListener('message', handler)
            reject(new Error('Element update timed out'))
          }, MODEL_ROOT_UPDATE_TIMEOUT_MS)

          const envelope: EnvelopeBase = {
            id: correlationId,
            type: EnvelopeMessageType.ELEMENT_UPDATE,
            source,
            target: 'host',
            version: '1.0',
            data: { elementId: shapeId, type, data: { ...patch, id: shapeId } },
          }
          window.parent.postMessage(envelope, '*')
        })
      },
    }

    sourceRef.current = createModelRootSource(transport)
  }
  const modelRootSource = sourceRef.current

  // Persistent listener for MODEL_ROOT_SNAPSHOT. NOT correlated by message
  // id: a post-write push carries the WRITE's envelope id, not any request
  // id (see modelRootHandler.ts's handleUpdate -- it reuses msg.id from the
  // MODEL_ROOT_UPDATE it's replying to). So this accepts every snapshot the
  // host sends for the life of the component, unlike the one-shot handlers
  // in usePortalSender / useUpgradeInterestSender.
  useEffect(() => {
    function handleSnapshot(event: MessageEvent) {
      const msg = event.data
      if (msg?.type === EnvelopeMessageType.MODEL_ROOT_SNAPSHOT) {
        const data = (msg.data || {}) as { projection?: ModelRootProjection }
        if (data.projection) {
          modelRootSource.acceptSnapshot(data.projection)
        }
      }
    }
    window.addEventListener('message', handleSnapshot)
    return () => window.removeEventListener('message', handleSnapshot)
  }, [modelRootSource])

  // Ask the host for the current projection once on mount. A StrictMode
  // double-invoke sends this twice, which just costs one extra snapshot
  // push -- acceptSnapshot is idempotent-safe against that (replaces the
  // reference with equivalent content), so no skip-once guard is needed.
  useEffect(() => {
    modelRootSource.request()
  }, [modelRootSource])

  const accessor = useMemo(
    () => createLucidModelStateAccessor(modelRootSource.deps),
    [modelRootSource],
  )

  // Mirrors the exact reference-stability contract createLucidModelStateAccessor
  // relies on: getModelDefinition returns the same object until acceptSnapshot
  // replaces it, and onModelChanged is the notify hook -- precisely what
  // useSyncExternalStore needs, and both are stable function identities for
  // the life of modelRootSource so this never over-subscribes.
  const projection = useSyncExternalStore(
    modelRootSource.deps.onModelChanged,
    modelRootSource.deps.getModelDefinition,
  ) as unknown as ModelRootProjection | null

  return { accessor, projection }
}
