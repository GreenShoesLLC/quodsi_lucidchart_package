// quodsim-react/src/features/editors/ArrivalsTab.tsx
//
// Lucid's mount point for the SHARED ArrivalsEditor (quodsi_studio/platforms/
// shared), guarded by adapters/__tests__/sharedPanelImport.test.tsx like every
// other shared panel. Only tab REGISTRATION differs between hosts.
//
// The accessor is the Model editor's one model-root accessor (spec
// 2026-09-12). Its activity summaries carry a self-generating activity's
// arrival links, so a pattern or schedule used only by such an activity is
// counted as used. Both keys this editor writes -- arrivalPatterns and
// arrivalSchedules -- are in updateModelRoot's known keys, which THROWS on a
// key it cannot persist rather than dropping it.

import React from 'react'
import { ArrivalsEditor } from 'quodsi_studio/platforms/shared'
import type { ModelStateAccessor } from 'quodsi_studio/platforms/shared'

export interface ArrivalsTabProps {
  accessor: ModelStateAccessor
}

export const ArrivalsTab: React.FC<ArrivalsTabProps> = ({ accessor }) => (
  <ArrivalsEditor accessor={accessor} />
)

export default ArrivalsTab
