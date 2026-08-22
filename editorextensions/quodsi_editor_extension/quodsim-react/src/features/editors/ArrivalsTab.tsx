// quodsim-react/src/features/editors/ArrivalsTab.tsx
//
// Lucid's mount point for the SHARED ArrivalsEditor (quodsi_studio/platforms/
// shared). The editor body is written once and compiled into every host --
// same arrangement as GeneratorPatternTab and ScheduleModal, guarded by
// adapters/__tests__/sharedPanelImport.test.tsx. Only tab REGISTRATION differs
// between hosts: Studio/drawio/Visio share a flat TABS array in their own
// ModelEditor, Lucid has TAB_CONFIG with icons and tooltips.
//
// The accessor comes from useModelRootSource, which issues a model-root
// request on mount. That is why this wrapper exists rather than calling the
// hook up in ModelEditor: rendering it only while the Arrivals tab is active
// keeps the request off every model-panel open.
//
// Both keys this editor writes -- arrivalPatterns and arrivalSchedules -- are
// in updateModelRoot's `knownKeys` on the extension side (core/ModelManager.ts),
// so each delete has a real persistence path. That matters here specifically:
// updateModelRoot THROWS on a key it cannot persist rather than dropping it.

import React from 'react'
import { ArrivalsEditor } from 'quodsi_studio/platforms/shared'
import { useModelRootSource } from '../../adapters/useModelRootSource'

export const ArrivalsTab: React.FC = () => {
  const { accessor } = useModelRootSource()
  return <ArrivalsEditor accessor={accessor} />
}

export default ArrivalsTab
