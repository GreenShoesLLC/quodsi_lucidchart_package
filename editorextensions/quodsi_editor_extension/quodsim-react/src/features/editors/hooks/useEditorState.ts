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
 * Debounces onSave(draft) after debounceMs when hasPendingChanges + isValid
 * + !isSaving. Also provides saveNow() for imperative flush, coalesces edits
 * during in-flight saves into a single trailing save, captures pending edits
 * on element switch (drained when the in-flight save completes), flushes on
 * unmount, and reports status="error" when onSave throws.
 *
 * Contract — REQUIRED of consumers:
 *   onSave MUST trigger a Redux-mediated isSaving transition (false → true →
 *   false). The hook uses the saving→not-saving transition to clear the
 *   "saving" status, fire trailing saves, and drain captured pending flushes.
 *   If onSave is synchronous and never causes isSaving to flip, status will
 *   stay at "saving" forever and trailing/captured saves will never fire.
 *
 *   In practice, every editor consumer routes onSave through Redux's
 *   elementOpsState, which dispatches ELEMENT_SAVE_START (sets isSaving=true)
 *   and ELEMENT_SAVE_SUCCESS/ERROR (sets isSaving=false). Honor that pattern.
 */
export function useAutoSave<T>(args: UseAutoSaveArgs<T>): UseAutoSaveResult {
  const { draft, hasPendingChanges, isValid, onSave, isSaving, elementId, debounceMs = 500 } = args;

  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Refs synced each render so timer callbacks see fresh values
  const draftRef = useRef(draft);
  const onSaveRef = useRef(onSave);
  const hasPendingRef = useRef(hasPendingChanges);
  const isValidRef = useRef(isValid);
  const isSavingRef = useRef(isSaving);
  draftRef.current = draft;
  onSaveRef.current = onSave;
  hasPendingRef.current = hasPendingChanges;
  isValidRef.current = isValid;
  isSavingRef.current = isSaving;

  const timerRef = useRef<number | null>(null);
  const wasSavingRef = useRef(isSaving);
  const trailingSaveNeededRef = useRef(false);
  const prevElementIdRef = useRef(elementId);
  const pendingFlushDraftRef = useRef<T | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dispatchSave = useCallback(() => {
    setStatus("saving");
    try {
      onSaveRef.current(draftRef.current);
    } catch (err) {
      console.error("[useAutoSave] save failed:", err);
      setStatus("error");
    }
  }, []);

  const saveNow = useCallback(() => {
    // Cancel any pending debounce timer regardless of guard results below,
    // so an explicit flush always wins over the timer path.
    clearTimer();
    if (!hasPendingRef.current) return;
    if (!isValidRef.current) {
      setStatus("invalid");
      return;
    }
    if (isSavingRef.current) {
      // No-op while a save is in flight. Task 5 adds trailingSaveNeededRef
      // so the edit is retried after the current save completes.
      return;
    }
    dispatchSave();
  }, [clearTimer, dispatchSave]);

  // Schedule debounced save on draft/dirty changes
  useEffect(() => {
    if (!hasPendingChanges) {
      return;
    }
    if (!isValid) {
      clearTimer();
      setStatus("invalid");
      return;
    }
    if (isSaving) {
      trailingSaveNeededRef.current = true;
      setStatus("saving");
      return;
    }
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (!hasPendingRef.current || !isValidRef.current) {
        // State changed between schedule and fire — bail.
        return;
      }
      if (isSavingRef.current) {
        // Save raced into flight between schedule and timer firing.
        // setStatus("saving") omitted — status is already "saving" because
        // dispatchSave() set it before the in-flight save started.
        trailingSaveNeededRef.current = true;
        return;
      }
      dispatchSave();
    }, debounceMs);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, hasPendingChanges, isValid, isSaving, debounceMs]);

  // Detect saving→not-saving transition. Three handling priorities:
  // 1. Captured pending flush (from element switch) — drain silently.
  // 2. Trailing save needed (edits during in-flight save) — fire it.
  // 3. Default — mark the current element saved.
  useEffect(() => {
    if (wasSavingRef.current && !isSaving) {
      if (pendingFlushDraftRef.current !== null) {
        // Drain the captured flush for the PREVIOUS element. Fire-and-forget:
        // failures log via console.error but do not surface in the new element's
        // UI status, because the user has already moved on.
        const captured = pendingFlushDraftRef.current;
        pendingFlushDraftRef.current = null;
        try {
          onSaveRef.current(captured);
        } catch (err) {
          console.error("[useAutoSave] pending flush failed:", err);
        }
        // Note: do NOT update status or lastSavedAt — the new element's panel
        // owns its own visual state.
      } else if (trailingSaveNeededRef.current) {
        trailingSaveNeededRef.current = false;
        if (hasPendingRef.current && isValidRef.current) {
          dispatchSave();
        } else {
          setStatus("saved");
          setLastSavedAt(Date.now());
        }
      } else {
        setStatus("saved");
        setLastSavedAt(Date.now());
      }
    }
    wasSavingRef.current = isSaving;
  }, [isSaving, dispatchSave]);

  // Element switch flush — see spec section "Edge cases" for ordering rationale.
  // useFormSync's setLocalDraft is queued for the next render, so draftRef.current
  // still holds the previous element's draft when this effect runs.
  //
  // When isSaving=true at switch time and there are pending edits, we cannot
  // dispatch a second save (Redux's per-element save queueing is not verified
  // for concurrent dispatch). Instead, we capture the pending draft into
  // pendingFlushDraftRef; the saving-transition effect will drain it after the
  // in-flight save completes. The drain is silent (no status update) because
  // the user has moved on to the new element.
  useEffect(() => {
    if (prevElementIdRef.current !== elementId) {
      clearTimer();
      if (hasPendingRef.current && isValidRef.current) {
        if (isSavingRef.current) {
          // Save in flight — capture pending draft for post-completion flush.
          pendingFlushDraftRef.current = draftRef.current;
        } else {
          dispatchSave();
        }
      }
      trailingSaveNeededRef.current = false;
      // Reset status to reflect the new (clean) element. If a captured flush
      // is pending in the background, its progress will not surface here.
      setStatus("saved");
      prevElementIdRef.current = elementId;
    }
  }, [elementId, clearTimer, dispatchSave]);

  // Unmount flush
  useEffect(() => {
    return () => {
      // Inline rather than calling clearTimer() to avoid adding a dep to the [] array.
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (hasPendingRef.current && isValidRef.current && !isSavingRef.current) {
        try {
          onSaveRef.current(draftRef.current);
        } catch (err) {
          // Cannot update React state during unmount — log for diagnosability.
          // (dispatchSave's own try/catch in Task 9 handles non-unmount errors.)
          console.error("[useAutoSave] unmount flush failed:", err);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, lastSavedAt, saveNow };
}

/**
 * Fire saveNow on the next render where `value` differs from the previously seen value.
 *
 * Designed for "decisive" UI controls that have no useful blur event (checkboxes,
 * selects). Wraps the prevRef-compare-and-fire pattern used in editor migrations
 * (Phase 1C/1D).
 *
 * Behavior:
 * - Does NOT fire on initial mount.
 * - Fires saveNow exactly once per change (then resets the ref).
 * - Does NOT fire when the value is the same across renders.
 *
 * Safe across element switches: useAutoSave's saveNow internally early-returns
 * when hasPendingChanges is false, so a stale prevRef-vs-new-draft mismatch on
 * a fresh element is suppressed.
 *
 * @param value - The value to watch (typically a primitive or stable reference)
 * @param saveNow - The flush callback returned by useAutoSave
 */
export function useFlushOnChange<T>(value: T, saveNow: () => void): void {
  const prevRef = useRef<T>(value);
  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      saveNow();
    }
  }, [value, saveNow]);
}
