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

import type { ModelStateAccessor, ModelStateSnapshot } from 'quodsi_studio/platforms/shared'

export type SaveState = Pick<ModelStateSnapshot, 'saveStatus' | 'saveError'>

export function combineSaveState(modelRoot: SaveState, reference: SaveState): SaveState {
  if (modelRoot.saveStatus === 'saving' || reference.saveStatus === 'saving') {
    return { saveStatus: 'saving', saveError: null }
  }
  if (modelRoot.saveStatus === 'failed') return { saveStatus: 'failed', saveError: modelRoot.saveError }
  if (reference.saveStatus === 'failed') return { saveStatus: 'failed', saveError: reference.saveError }
  if (modelRoot.saveStatus === 'saved' || reference.saveStatus === 'saved') {
    return { saveStatus: 'saved', saveError: null }
  }
  return { saveStatus: 'idle', saveError: null }
}

export function createElementEditorAccessor(
  modelRoot: ModelStateAccessor,
  reference: ModelStateAccessor,
): ModelStateAccessor {
  let lastModelRoot: ModelStateSnapshot | undefined
  let lastReference: ModelStateSnapshot | undefined
  let cached: ModelStateSnapshot | undefined

  // A new object only when either source's snapshot object changed:
  // useSyncExternalStore re-renders forever on a fresh object per call.
  const getSnapshot = (): ModelStateSnapshot => {
    const fromModelRoot = modelRoot.getSnapshot()
    const fromReference = reference.getSnapshot()
    if (cached && fromModelRoot === lastModelRoot && fromReference === lastReference) return cached
    lastModelRoot = fromModelRoot
    lastReference = fromReference
    const definition = fromModelRoot.modelDefinition as unknown as Record<string, unknown> | null
    const connectors =
      (fromReference.modelDefinition as unknown as { connectors?: unknown[] } | null)?.connectors ?? []
    cached = {
      ...combineSaveState(fromModelRoot, fromReference),
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
