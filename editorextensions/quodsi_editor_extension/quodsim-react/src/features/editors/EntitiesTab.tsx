// quodsim-react/src/features/editors/EntitiesTab.tsx
//
// Lucid's mount point for the SHARED EntitiesEditor (quodsi_studio/platforms/
// shared). Only tab REGISTRATION differs between hosts; the body is compiled
// into this bundle.
//
// WRITES: accessor.updateModel({ entities }) -> MODEL_ROOT_UPDATE ->
// ModelManager.updateModelRoot -> updateEntities, which re-inserts the Default
// Entity and runs the shared delete rule over stored shape data. Hence
// referenceCleanup="host".
//
// The accessor is the Model editor's one model-root accessor (spec
// 2026-09-12). The loading gate and the page-switch remount that used to live
// here belong to ModelEditorForPage and ElementEditor now (see StatesTab).

import React from 'react'
import { EntitiesEditor } from 'quodsi_studio/platforms/shared'
import type { ModelStateAccessor } from 'quodsi_studio/platforms/shared'

export interface EntitiesTabProps {
  accessor: ModelStateAccessor
}

export const EntitiesTab: React.FC<EntitiesTabProps> = ({ accessor }) => (
  <EntitiesEditor accessor={accessor} referenceCleanup="host" />
)

export default EntitiesTab
