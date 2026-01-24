/**
 * Simple module-level store for pending navigation state.
 * Used to communicate the desired tab when navigating to Model Editor.
 */

import { EditorTab } from '../features/editors/ModelEditor';

let pendingModelEditorTab: EditorTab | null = null;

/**
 * Set the pending Model Editor tab.
 * Call this before triggering navigation to Model Editor.
 */
export function setPendingModelEditorTab(tab: EditorTab): void {
  pendingModelEditorTab = tab;
}

/**
 * Get and clear the pending Model Editor tab.
 * Returns the pending tab (if any) and clears it so it's only used once.
 */
export function consumePendingModelEditorTab(): EditorTab | null {
  const tab = pendingModelEditorTab;
  pendingModelEditorTab = null;
  return tab;
}

/**
 * Check if there's a pending Model Editor tab without consuming it.
 */
export function hasPendingModelEditorTab(): boolean {
  return pendingModelEditorTab !== null;
}
