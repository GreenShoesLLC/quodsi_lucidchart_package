// quodsim-react/src/features/modelPanel/useModelEditorTab.ts
//
// The Model editor's active tab, held by ModelPanel so it survives
// ElementEditor's page-keyed remount (spec 2026-09-13 §1). Selecting the
// Validation tab asks the extension for a fresh result; a "Go to Model
// Editor" link's stored tab is applied when the Model shows.

import { useCallback, useState } from 'react'
import type { ModelEditorTab } from 'quodsi_studio/platforms/shared'
import { consumePendingModelEditorTab } from '../../utils/pendingNavigation'

export function useModelEditorTab(onValidate?: () => void) {
  const [activeTab, setActiveTab] = useState<ModelEditorTab>('Basic')

  const onTabChange = useCallback(
    (tab: ModelEditorTab) => {
      setActiveTab(tab)
      if (tab === 'Validation') onValidate?.()
    },
    [onValidate],
  )

  const applyPendingTab = useCallback(() => {
    const pending = consumePendingModelEditorTab()
    if (pending) setActiveTab(pending)
  }, [])

  return { activeTab, onTabChange, applyPendingTab }
}
