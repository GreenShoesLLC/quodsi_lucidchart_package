import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Custom hook that syncs form state when the element ID changes.
 *
 * This handles the case where the user switches from editing Element A to Element B.
 * The form should ALWAYS update to show Element B's data when switching elements,
 * but should skip updates when the same element's props change and there are pending edits.
 *
 * Generic version that works with any element type (Activity, Generator, Entity, etc.)
 *
 * @param elementId - The ID of the currently selected element
 * @param hasPendingChanges - Whether there are unsaved changes (guard condition for same element)
 * @param extractElementData - Function to extract fresh element data from props
 * @param setLocalDraft - State setter to update the form draft
 * @param setHasPendingChanges - Optional state setter to clear the pending changes flag when switching elements
 */
export function useFormSync<T>(
  elementId: string,
  hasPendingChanges: boolean,
  extractElementData: () => T,
  setLocalDraft: (element: T) => void,
  setHasPendingChanges?: (value: boolean) => void
) {
  // Track previous element ID to detect when user switches to a different element
  const previousElementIdRef = useRef(elementId);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const elementIdChanged = previousElementIdRef.current !== elementId;

    if (elementIdChanged) {
      // ALWAYS sync when switching to a different element - this is a fresh context
      setLocalDraft(extractElementData());

      // Clear pending changes flag when switching elements
      // User is now editing a different element, so previous edits don't matter
      if (setHasPendingChanges) {
        setHasPendingChanges(false);
      }

      // Update the ref for next comparison
      previousElementIdRef.current = elementId;
    } else if (!hasPendingChanges) {
      // Same element, no pending changes - safe to sync from props
      setLocalDraft(extractElementData());
    }
    // If same element AND pending changes - skip sync to preserve user's edits
  }, [elementId]);
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

/**
 * Status reported by useAutoSave for rendering in the SaveStatusLine.
 * - "saved": idle; no pending edits, last save (if any) succeeded.
 * - "saving": save is in flight, or about to fire from a debounce timer.
 * - "invalid": pending edits exist but draft fails validation; no save will fire.
 * - "error": last save threw. The next edit retriggers debounce → automatic retry.
 */
export type SaveStatus = "saved" | "saving" | "invalid" | "error";

export interface UseAutoSaveArgs<T> {
  /** Current local draft. */
  draft: T;
  /** Whether the user has unsaved changes (existing dirty flag — kept). */
  hasPendingChanges: boolean;
  /** Whether the draft passes validation. When false, no save fires. */
  isValid: boolean;
  /** Existing save callback — receives the draft when auto-save fires. */
  onSave: (draft: T) => void;
  /** True while a save is in flight (from Redux elementOpsState). */
  isSaving: boolean;
  /** ID of the currently selected element. Switching this flushes pending edits. */
  elementId: string;
  /** Debounce delay in ms. Defaults to 500. */
  debounceMs?: number;
}

export interface UseAutoSaveResult {
  status: SaveStatus;
  lastSavedAt: number | null;
  /** Imperative flush — bypasses debounce. Use from onBlur and discrete-event handlers. */
  saveNow: () => void;
}

/**
 * Auto-save hook for inline panel editors.
 *
 * Phase 0 stub — types and signature only; no save fires yet. Subsequent tasks
 * implement debounce, saveNow, validation gating, in-flight coalescing,
 * element-switch flush, unmount flush, and error handling.
 */
export function useAutoSave<T>(_args: UseAutoSaveArgs<T>): UseAutoSaveResult {
  const [status] = useState<SaveStatus>("saved");
  const [lastSavedAt] = useState<number | null>(null);
  const saveNow = useCallback(() => {
    /* implemented in later tasks */
  }, []);
  return { status, lastSavedAt, saveNow };
}
