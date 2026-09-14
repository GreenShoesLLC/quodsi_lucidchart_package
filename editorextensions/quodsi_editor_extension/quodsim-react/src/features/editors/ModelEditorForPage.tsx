// quodsim-react/src/features/editors/ModelEditorForPage.tsx
//
// The Model editor's data source (spec 2026-09-12 §4): ONE useModelRootSource
// per Lucid page. ElementEditor mounts this with key={pageId}, so a page
// switch unmounts the whole editor -- source, open dialogs -- and a fresh
// MODEL_ROOT_REQUEST fires for the new page. Once the first snapshot lands it
// renders Studio's shared ModelEditor through LucidModelEditor (spec
// 2026-09-13), whose every tab reads the one projection and writes through the
// one accessor.
//
// NOTHING EDITABLE BEFORE THE FIRST SNAPSHOT. Every list tab writes whole
// lists; an "Add" on an empty, not-yet-loaded list would send a one-row list
// the host reads as deleting everything else.
//
// REFRESH. useModelRootRefreshOnSelection re-requests a snapshot whenever a
// selection message lands (see that hook for why).

import React from 'react'
import type { ValidationResult } from '@quodsi/lucid-shared'
import type { ModelEditorTab } from 'quodsi_studio/platforms/shared'
import { useModelRootSource } from '../../adapters/useModelRootSource'
import { useModelRootRefreshOnSelection } from '../../adapters/useModelRootRefreshOnSelection'
import { LucidModelEditor } from './LucidModelEditor'

export interface ModelEditorForPageProps {
  validationState?: ValidationResult | null
  activeTab?: ModelEditorTab
  onTabChange?: (tab: ModelEditorTab) => void
}

export const ModelEditorForPage: React.FC<ModelEditorForPageProps> = (props) => {
  const { accessor, projection, request } = useModelRootSource()
  useModelRootRefreshOnSelection(request)

  if (!projection) {
    return <div className="p-3 text-xs text-muted">Loading model…</div>
  }
  return <LucidModelEditor accessor={accessor} {...props} />
}

export default ModelEditorForPage
