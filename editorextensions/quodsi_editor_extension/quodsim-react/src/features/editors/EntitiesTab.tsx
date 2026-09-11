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
//
// PAGE SWITCH. useModelRootSource requests a snapshot only on mount;
// ModelPanel keeps `activeTab` across a Lucid page switch and ModelEditor is
// not keyed, so with the Entities tab open, switching pages left page A's
// projection mounted. An Add/Delete then sent page A's whole `entities` list
// to the host, which wrote it against the CURRENT page B -- updateEntities
// treated every one of B's real entities as deleted and cascaded their
// references. `EntitiesTab` now reads the current page id (the same
// selection.documentContext?.pageId other panels use, e.g. ModelPanel.tsx)
// and keys an inner component on it, so a page switch remounts the
// useModelRootSource consumer: a fresh MODEL_ROOT_REQUEST fires and the
// loading gate above re-arms before anything can write to the wrong page.

import React from 'react'
import { EntitiesEditor } from 'quodsi_studio/platforms/shared'
import { useModelRootSource } from '../../adapters/useModelRootSource'
import { useMessaging } from '../../messaging/MessageProvider'

const EntitiesTabForPage: React.FC = () => {
  const { accessor, projection } = useModelRootSource()
  if (!projection) {
    return <div className="p-3 text-xs text-muted">Loading…</div>
  }
  return <EntitiesEditor accessor={accessor} referenceCleanup="host" />
}

export const EntitiesTab: React.FC = () => {
  const { selection } = useMessaging()
  const pageId = selection.documentContext?.pageId
  return <EntitiesTabForPage key={pageId} />
}

export default EntitiesTab
