// quodsim-react/src/adapters/elementEditorAccessor.ts
//
// One ModelStateAccessor for Studio's shared element editors in Lucid (spec
// 2026-09-14 lucid-shared-generator-editor §1). The model-root source serves
// everything EXCEPT connectors: its snapshot carries connector SUMMARIES,
// whose actions drop an assign's `condition` and `name` -- exactly what
// ConnectorMoveTimeSection reads to decide whether move-time state changes may
// merge. So `connectors` come from the selection's reference data (full
// records), and Connector writes take that accessor's confirmed ELEMENT_UPDATE
// with its immediate overlay -- the path the shared ConnectorEditor already
// uses in Lucid. Everything else (Activity/Generator shape edits, model-level
// lists, flushModelImmediate) stays on the model-root queue.
//
// SAVE STATUS. `saving` while either source is saving; otherwise the outcome
// of whichever source settled MOST RECENTLY; `idle` until one has. Neither
// source ever resets its own status (the reference accessor keeps a refused
// connector write's `failed` through every later setReferenceData, and this
// composite outlives generator re-selection), so "failed if either failed"
// would pin one refusal to the header through every later successful save.
// Settles are ordered with ticks, as LucidModelStateAccessor orders its own
// writes against its batching source's.

import type { ModelStateAccessor, ModelStateSnapshot } from 'quodsi_studio/platforms/shared'

export type SaveState = Pick<ModelStateSnapshot, 'saveStatus' | 'saveError'>
export type SaveSource = 'modelRoot' | 'reference'

/**
 * `latest` names the source that settled most recently, or null if neither
 * has. The composite only ever names a source whose status is an outcome:
 * neither source goes back to `idle` once it has settled.
 */
export function combineSaveState(modelRoot: SaveState, reference: SaveState, latest: SaveSource | null): SaveState {
  if (modelRoot.saveStatus === 'saving' || reference.saveStatus === 'saving') {
    return { saveStatus: 'saving', saveError: null }
  }
  const settled = latest === 'modelRoot' ? modelRoot : latest === 'reference' ? reference : null
  if (settled?.saveStatus === 'failed') return { saveStatus: 'failed', saveError: settled.saveError }
  if (settled?.saveStatus === 'saved') return { saveStatus: 'saved', saveError: null }
  return { saveStatus: 'idle', saveError: null }
}

type SettleTracker = { seen: SaveState | undefined; settledTick: number }

export function createElementEditorAccessor(
  modelRoot: ModelStateAccessor,
  reference: ModelStateAccessor,
): ModelStateAccessor {
  let lastModelRoot: ModelStateSnapshot | undefined
  let lastReference: ModelStateSnapshot | undefined
  let cached: ModelStateSnapshot | undefined

  let tick = 0
  const modelRootSettles: SettleTracker = { seen: undefined, settledTick: 0 }
  const referenceSettles: SettleTracker = { seen: undefined, settledTick: 0 }

  // A settle is an outcome (`saved`/`failed`) that differs from the status last
  // seen -- which covers passing through `saving`, since `saving` is recorded
  // when seen. Compared by CONTENT: a source snapshot rebuilt for a data
  // change (a connector list refresh) with the same status is not a new
  // settle. A source first seen already settled is stamped then; model-root
  // is observed first, so a reference outcome first seen at the same moment
  // counts as the later one.
  function observe(tracker: SettleTracker, state: SaveState): void {
    const seen = tracker.seen
    if (seen && seen.saveStatus === state.saveStatus && seen.saveError === state.saveError) return
    tracker.seen = { saveStatus: state.saveStatus, saveError: state.saveError }
    if (state.saveStatus === 'saved' || state.saveStatus === 'failed') tracker.settledTick = ++tick
  }

  function latestSettled(): SaveSource | null {
    if (modelRootSettles.settledTick === 0 && referenceSettles.settledTick === 0) return null
    return referenceSettles.settledTick > modelRootSettles.settledTick ? 'reference' : 'modelRoot'
  }

  // A new object only when either source's snapshot object changed:
  // useSyncExternalStore re-renders forever on a fresh object per call.
  const getSnapshot = (): ModelStateSnapshot => {
    const fromModelRoot = modelRoot.getSnapshot()
    const fromReference = reference.getSnapshot()
    if (cached && fromModelRoot === lastModelRoot && fromReference === lastReference) return cached
    lastModelRoot = fromModelRoot
    lastReference = fromReference
    observe(modelRootSettles, fromModelRoot)
    observe(referenceSettles, fromReference)
    const definition = fromModelRoot.modelDefinition as unknown as Record<string, unknown> | null
    const connectors =
      (fromReference.modelDefinition as unknown as { connectors?: unknown[] } | null)?.connectors ?? []
    cached = {
      ...combineSaveState(fromModelRoot, fromReference, latestSettled()),
      modelDefinition: (definition === null
        ? null
        : { ...definition, connectors }) as unknown as ModelStateSnapshot['modelDefinition'],
    }
    return cached
  }

  return {
    ...modelRoot,
    subscribe(listener) {
      const offModelRoot = modelRoot.subscribe(listener)
      const offReference = reference.subscribe(listener)
      return () => {
        offModelRoot()
        offReference()
      }
    },
    getSnapshot,
    updateShape: (shapeId, type, patch) =>
      type === 'Connector'
        ? reference.updateShape(shapeId, type, patch)
        : modelRoot.updateShape(shapeId, type, patch),
    updateModel: (patch, options) => modelRoot.updateModel(patch, options),
  }
}
