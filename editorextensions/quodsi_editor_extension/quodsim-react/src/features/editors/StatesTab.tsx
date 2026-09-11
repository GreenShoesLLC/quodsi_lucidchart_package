// quodsim-react/src/features/editors/StatesTab.tsx
//
// Lucid's mount point for the SHARED StatesEditor (quodsi_studio/platforms/
// shared) inside the Model editor's States tab (spec 2026-09-11 States).
//
// Unlike EntitiesTab/ResourcesTab, this tab does not own an accessor of its
// own: the States tab's data already reaches ModelEditor through the
// selection-driven `referenceData` prop, so ModelEditor's single
// useReferenceDataAccessor instance is passed straight in. Creating a second
// accessor here would fork state for no reason -- the existing instance's
// overlay is already cleared whenever a fresh `referenceData` prop lands
// (see useReferenceDataAccessor.setReferenceData).
//
// THE LOADING GATE IS LOAD-BEARING. Before the host's first real
// referenceData arrives, `hasStates` is false (see useModelPanel's
// EMPTY_REFERENCE_DATA, which deliberately carries no `states` key -- final
// fix wave I1) and this renders the loading line instead of the shared
// editor. Without it the editor would show an empty list with "Add State"
// enabled, and an Add there would send a one-row list that
// ModelManager.updateStates treats as deleting every existing state.
//
// PAGE SWITCH. ModelPanel keeps `activeTab` across a Lucid page switch and
// ModelEditor is not keyed, so with the States tab open, switching Lucid
// pages left StatesEditor's local `editingState` / `deletingState` referring
// to page A's data -- saving or confirming there would push page A's state
// into page B's list, or delete by page A's id. StatesTab reads the current
// page id (the same selection.documentContext?.pageId other panels use, e.g.
// ModelPanel.tsx) and keys StatesEditor on it, so a page switch remounts the
// editor and drops any open dialog before it can act against the wrong page.

import React from 'react'
import { StatesEditor } from 'quodsi_studio/platforms/shared'
import type { ModelStateAccessor } from 'quodsi_studio/platforms/shared'
import { useMessaging } from '../../messaging/MessageProvider'

export interface StatesTabProps {
  accessor: ModelStateAccessor
  /** referenceData?.states !== undefined -- see the loading-gate comment above. */
  hasStates: boolean
}

export const StatesTab: React.FC<StatesTabProps> = ({ accessor, hasStates }) => {
  const { selection } = useMessaging()
  const pageId = selection.documentContext?.pageId

  if (!hasStates) {
    return <div className="p-3 text-xs text-muted">Loading…</div>
  }
  return <StatesEditor key={pageId} accessor={accessor} referenceCleanup="host" />
}

export default StatesTab
