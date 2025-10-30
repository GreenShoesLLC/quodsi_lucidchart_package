import { useEffect, useRef } from "react";

/**
 * Custom hook that syncs form state when the element ID changes.
 *
 * This handles the case where the user switches from editing Element A to Element B.
 * The form should update to show Element B's data, but ONLY if there are no pending
 * changes (to avoid losing user edits).
 *
 * Generic version that works with any element type (Activity, Generator, Entity, etc.)
 *
 * @param elementId - The ID of the currently selected element
 * @param hasPendingChanges - Whether there are unsaved changes (guard condition)
 * @param extractElementData - Function to extract fresh element data from props
 * @param setLocalDraft - State setter to update the form draft
 */
export function useFormSync<T>(
  elementId: string,
  hasPendingChanges: boolean,
  extractElementData: () => T,
  setLocalDraft: (element: T) => void
) {
  // Sync localDraft when element ID changes (switching to different element)
  // hasPendingChanges is a guard condition (protects edits), not a trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hasPendingChanges) {
      setLocalDraft(extractElementData());
    }
  }, [elementId]);
}

/**
 * DEPRECATED: Use useFormSync instead.
 * Kept for backward compatibility with ActivityEditor.
 */
export function useActivityFormSync(
  activityId: string,
  hasPendingChanges: boolean,
  extractActivityData: () => any,
  setLocalActivityDraft: (activity: any) => void
) {
  return useFormSync(activityId, hasPendingChanges, extractActivityData, setLocalActivityDraft);
}

/**
 * Custom hook that detects when a save operation completes and clears the
 * pending changes flag.
 *
 * This prevents a race condition where hasPendingChanges is cleared prematurely.
 * We only clear it when we detect a transition from saving→not saving, which
 * indicates the save completed successfully.
 *
 * Why use a ref: We need to track the previous isSaving value to detect the
 * transition. A ref persists across renders without causing re-renders.
 *
 * @param isSaving - Whether a save operation is currently in progress
 * @param setHasPendingChanges - State setter to clear the pending changes flag
 */
export function useSaveCompletionDetector(
  isSaving: boolean,
  setHasPendingChanges: (hasChanges: boolean) => void
) {
  // Track previous isSaving state to detect save completion
  const previousSavingStateRef = useRef(isSaving);

  useEffect(() => {
    // Only clear hasPendingChanges when transitioning from saving→not saving
    if (previousSavingStateRef.current && !isSaving) {
      // Save just completed - clear the pending changes flag
      setHasPendingChanges(false);
    }
    // Update ref for next render
    previousSavingStateRef.current = isSaving;
  }, [isSaving, setHasPendingChanges]);
}
