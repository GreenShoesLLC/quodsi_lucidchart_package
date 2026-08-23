// quodsim-react/src/features/editors/ResourcesTab.tsx
//
// Lucid's mount point for the SHARED ResourcesEditor (quodsi_studio/platforms/
// shared) -- the model-level list of Resources introduced by Plan 2b. Written
// once and compiled into every host, exactly like ArrivalsTab above it and
// guarded by adapters/__tests__/sharedPanelImport.test.tsx. Only tab
// REGISTRATION differs between hosts: Studio/drawio/Visio share a flat TABS
// array in their own ModelEditor, Lucid has TAB_CONFIG with icons and tooltips.
//
// The accessor comes from useModelRootSource, which issues a model-root
// request on mount. That is why this wrapper exists rather than calling the
// hook up in ModelEditor: rendering it only while the Resources tab is active
// keeps the request off every model-panel open.
//
// The keys this editor writes -- `resources`, plus `resourceRequirements` /
// `activities` / `connectors` when a delete cascades -- must all be in
// updateModelRoot's `knownKeys` on the extension side (core/ModelManager.ts),
// which THROWS on a key it cannot persist rather than dropping it silently.
//
// Link status (which shape or lane represents each resource) is resolved
// through accessor.getShapeInfo, which useModelRootSource serves from the
// same projection -- see its own comment for why that lookup is a pure
// cached read rather than a host round trip.

import React from 'react'
import { ResourcesEditor } from 'quodsi_studio/platforms/shared'
import { useModelRootSource } from '../../adapters/useModelRootSource'

export const ResourcesTab: React.FC = () => {
  const { accessor } = useModelRootSource()
  return <ResourcesEditor accessor={accessor} />
}

export default ResourcesTab
