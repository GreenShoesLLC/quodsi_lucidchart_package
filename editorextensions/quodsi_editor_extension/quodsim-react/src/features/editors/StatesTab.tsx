// quodsim-react/src/features/editors/StatesTab.tsx
//
// Lucid's mount point for the SHARED StatesEditor (quodsi_studio/platforms/
// shared) inside the Model editor's States tab.
//
// The accessor is the Model editor's ONE model-root accessor (spec
// 2026-09-12): states arrive on the MODEL_ROOT_SNAPSHOT as full rows, and a
// save sends accessor.updateModel({ states }) -> MODEL_ROOT_UPDATE ->
// ModelManager.updateModelRoot -> updateStates, which runs the shared
// state-delete rule over stored shape data. Hence referenceCleanup="host".
//
// No loading gate and no page key here any more: ModelEditorForPage renders
// the editor only after the first snapshot (an empty list with "Add State"
// would send a one-row list that updateStates reads as deleting every state),
// and ElementEditor keys it on the Lucid page id, so a page switch unmounts
// any open dialog before it can act on the wrong page.

import React from 'react'
import { StatesEditor } from 'quodsi_studio/platforms/shared'
import type { ModelStateAccessor } from 'quodsi_studio/platforms/shared'

export interface StatesTabProps {
  accessor: ModelStateAccessor
}

export const StatesTab: React.FC<StatesTabProps> = ({ accessor }) => (
  <StatesEditor accessor={accessor} referenceCleanup="host" />
)

export default StatesTab
