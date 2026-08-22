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
//  - Auto-requirements (id === resource id) are stripped before sending --
//    q_res_requirements holds customs only; the extension re-mints autos.
//  - After a successful write the snapshot OVERLAYS the sent list until the
//    next referenceData prop lands, so the picker never flashes
//    "(missing requirement: …)" between the RESULT and the selection refresh.
//  - updateShape throws: referenceData.activities are summaries.

import { useEffect, useRef } from 'react'
import type { EditorReferenceData, ISerializedResourceRequirement } from '@quodsi/lucid-shared'
import type { ModelStateAccessor, ModelStateSnapshot } from 'quodsi_studio/platforms/shared'

export type ReferenceDataSenders = {
  updateResourceRequirements: (list: ISerializedResourceRequirement[]) => Promise<void>
}

type RequirementRecord = { id: string; name: string; rootClause?: unknown }

export type ReferenceDataSource = {
  accessor: ModelStateAccessor
  setReferenceData(next: EditorReferenceData | undefined): void
}

export function createReferenceDataAccessor(
  initial: EditorReferenceData | undefined,
  getSenders: () => ReferenceDataSenders,
): ReferenceDataSource {
  let referenceData = initial
  let overlay: RequirementRecord[] | null = null
  let saveStatus: ModelStateSnapshot['saveStatus'] = 'idle'
  let saveError: string | null = null
  const listeners = new Set<() => void>()

  const build = (): ModelStateSnapshot => ({
    modelDefinition: {
      resources: referenceData?.resources ?? [],
      resourceRequirements: overlay ?? (referenceData?.resourceRequirements as unknown as RequirementRecord[] | undefined) ?? [],
      activities: referenceData?.activities ?? [],
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
      const resourceIds = new Set((referenceData?.resources ?? []).map((r) => r.id))
      const customs = list
        .filter((r) => !resourceIds.has(r.id))
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
    async updateShape() {
      throw new Error('useReferenceDataAccessor.updateShape: not supported — referenceData.activities are summaries; patch the editor draft instead')
    },
  }

  return {
    accessor,
    setReferenceData(next) {
      if (next === referenceData) return
      referenceData = next
      overlay = null
      notify()
    },
  }
}

export function useReferenceDataAccessor(
  referenceData: EditorReferenceData | undefined,
  senders: ReferenceDataSenders,
): ModelStateAccessor {
  const sendersRef = useRef(senders)
  sendersRef.current = senders
  const sourceRef = useRef<ReferenceDataSource | null>(null)
  if (!sourceRef.current) {
    sourceRef.current = createReferenceDataAccessor(referenceData, () => sendersRef.current)
  }
  // Prop → source in an effect, not during render: setReferenceData notifies
  // useSyncExternalStore subscribers, which must not happen mid-render.
  // Previous-value compare lives inside setReferenceData (StrictMode-safe).
  useEffect(() => {
    sourceRef.current!.setReferenceData(referenceData)
  }, [referenceData])
  return sourceRef.current.accessor
}
