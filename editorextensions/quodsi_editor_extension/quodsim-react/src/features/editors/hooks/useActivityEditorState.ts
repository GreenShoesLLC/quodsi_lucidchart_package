import { useEffect, useRef } from "react";
import { Activity } from "@quodsi/shared";

/**
 * Custom hook that syncs form state when the activity ID changes.
 *
 * This handles the case where the user switches from editing Activity A to Activity B.
 * The form should update to show Activity B's data, but ONLY if there are no pending
 * changes (to avoid losing user edits).
 *
 * @param activityId - The ID of the currently selected activity
 * @param hasPendingChanges - Whether there are unsaved changes (guard condition)
 * @param extractActivityData - Function to extract fresh activity data from props
 * @param setLocalActivityDraft - State setter to update the form draft
 */
export function useActivityFormSync(
  activityId: string,
  hasPendingChanges: boolean,
  extractActivityData: () => Activity,
  setLocalActivityDraft: (activity: Activity) => void
) {
  // Sync localActivityDraft when activity ID changes (switching to different activity)
  // hasPendingChanges is a guard condition (protects edits), not a trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hasPendingChanges) {
      setLocalActivityDraft(extractActivityData());
    }
  }, [activityId]);
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
