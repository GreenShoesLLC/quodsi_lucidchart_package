// quodsim-react/src/features/editors/ModelEditorForPage.tsx
//
// The Model editor's data source (spec 2026-09-12 §4): ONE useModelRootSource
// per Lucid page. ElementEditor mounts this with key={pageId}, so a page
// switch unmounts the whole editor -- source, draft, open dialogs -- and a
// fresh MODEL_ROOT_REQUEST fires for the new page. Every tab of ModelEditor
// reads the one projection and writes through the one accessor.
//
// NOTHING EDITABLE BEFORE THE FIRST SNAPSHOT. Every list tab writes whole
// lists; an "Add" on an empty, not-yet-loaded list would send a one-row list
// the host reads as deleting everything else.
//
// REFRESH. The host pushes a snapshot only after a MODEL_ROOT_UPDATE. Canvas
// edits, the Advisor's Apply and embedded Studio's writes (ELEMENT_UPDATE
// Model, STATES_UPDATE, ENTITIES_UPDATE) push none -- but each ends in a
// selection re-process, which changes selection.lastUpdated. So a changed
// lastUpdated re-requests a snapshot. Previous-value compare, not a skip-once
// ref: React StrictMode re-runs effects, and a skip-once ref fires on the
// re-run.

import React, { useEffect, useRef } from 'react'
import type { ValidationResult } from '@quodsi/lucid-shared'
import { useModelRootSource } from '../../adapters/useModelRootSource'
import { useMessaging } from '../../messaging/MessageProvider'
import ModelEditor, { type EditorTab } from './ModelEditor'

export interface ModelEditorForPageProps {
  onValidate?: () => void
  validationState?: ValidationResult | null
  activeTab?: EditorTab
  onTabChange?: (tab: EditorTab) => void
}

export const ModelEditorForPage: React.FC<ModelEditorForPageProps> = (props) => {
  const { accessor, projection, request } = useModelRootSource()
  const { selection } = useMessaging()
  const lastUpdated = selection?.lastUpdated
  const previousLastUpdated = useRef(lastUpdated)

  useEffect(() => {
    if (previousLastUpdated.current === lastUpdated) return
    previousLastUpdated.current = lastUpdated
    request()
  }, [lastUpdated, request])

  if (!projection) {
    return <div className="p-3 text-xs text-muted">Loading model…</div>
  }
  return <ModelEditor accessor={accessor} projection={projection} {...props} />
}

export default ModelEditorForPage
