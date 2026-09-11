// quodsim-react/src/features/editors/EntitiesTab.tsx
//
// Lucid's mount point for the SHARED EntitiesEditor (quodsi_studio/platforms/
// shared), same shape as ResourcesTab beside it (spec 2026-09-11). Only tab
// REGISTRATION differs between hosts; the body is compiled into this bundle.
//
// The accessor comes from useModelRootSource, which issues a model-root
// request on mount -- rendering this wrapper only while the Entities tab is
// active keeps that request off every model-panel open.
//
// WRITES: accessor.updateModel({ entities }) -> MODEL_ROOT_UPDATE ->
// ModelManager.updateModelRoot -> updateEntities, which re-inserts the Default
// Entity and runs the shared delete rule over stored shape data. Hence
// referenceCleanup="host": the projection carries only summaries of
// activities/generators and no connectors, so the panel must not cascade.
//
// THE LOADING GATE IS LOAD-BEARING. Before the first MODEL_ROOT_SNAPSHOT the
// accessor's modelDefinition is null and the shared editor would render an
// empty list with "Add Entity" enabled. Adding one there sends
// `entities: [newOne]`, and updateEntities treats every existing entity as
// deleted -- cascading their references to the Default Entity.

import React from 'react'
import { EntitiesEditor } from 'quodsi_studio/platforms/shared'
import { useModelRootSource } from '../../adapters/useModelRootSource'

export const EntitiesTab: React.FC = () => {
  const { accessor, projection } = useModelRootSource()
  if (!projection) {
    return <div className="p-3 text-xs text-muted">Loading…</div>
  }
  return <EntitiesEditor accessor={accessor} referenceCleanup="host" />
}

export default EntitiesTab
