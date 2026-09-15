/**
 * Simple module-level store for pending navigation state.
 * Used to communicate the desired tab when navigating to the Model editor.
 */

import type { ModelEditorTab } from 'quodsi_studio/platforms/shared';

let pendingModelEditorTab: ModelEditorTab | null = null;

/**
 * Set the pending Model editor tab.
 * Call this before triggering navigation to the Model editor.
 */
export function setPendingModelEditorTab(tab: ModelEditorTab): void {
  pendingModelEditorTab = tab;
}

/**
 * Get and clear the pending Model editor tab.
 * Returns the pending tab (if any) and clears it so it's only used once.
 */
export function consumePendingModelEditorTab(): ModelEditorTab | null {
  const tab = pendingModelEditorTab;
  pendingModelEditorTab = null;
  return tab;
}
