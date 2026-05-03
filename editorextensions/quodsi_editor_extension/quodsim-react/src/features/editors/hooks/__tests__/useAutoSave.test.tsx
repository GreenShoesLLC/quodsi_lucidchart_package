import { renderHook, act } from "@testing-library/react";
import { useAutoSave, UseAutoSaveArgs } from "../useEditorState";

type TestDraft = { id: string; name: string };

const baseArgs = (overrides: Partial<UseAutoSaveArgs<TestDraft>> = {}): UseAutoSaveArgs<TestDraft> => ({
  draft: { id: "e1", name: "initial" },
  hasPendingChanges: false,
  isValid: true,
  onSave: jest.fn(),
  isSaving: false,
  elementId: "e1",
  debounceMs: 500,
  ...overrides,
});

describe("useAutoSave", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("debounce", () => {
    it("fires onSave after debounceMs when dirty + valid + not saving", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      expect(onSave).not.toHaveBeenCalled();

      // User edits → draft changes + hasPendingChanges flips true
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));

      expect(onSave).not.toHaveBeenCalled();

      // Just before debounce — still no save
      act(() => {
        jest.advanceTimersByTime(499);
      });
      expect(onSave).not.toHaveBeenCalled();

      // Debounce expires
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({ id: "e1", name: "edited" });
    });
  });

  describe("saveNow", () => {
    it("flushes immediately, bypassing the debounce timer", () => {
      const onSave = jest.fn();
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));

      // saveNow before debounce expires
      act(() => {
        result.current.saveNow();
      });

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({ id: "e1", name: "edited" });
    });

    it("does not fire onSave again when the debounce timer later expires", () => {
      const onSave = jest.fn();
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));

      act(() => {
        result.current.saveNow();
      });
      expect(onSave).toHaveBeenCalledTimes(1);

      // Advance well past the debounce window
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onSave).toHaveBeenCalledTimes(1); // still just one
    });

    it("does nothing when there are no pending changes", () => {
      const onSave = jest.fn();
      const { result } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave, hasPendingChanges: false }) }
      );

      act(() => {
        result.current.saveNow();
      });

      expect(onSave).not.toHaveBeenCalled();

      // Advancing time afterward must also produce no save —
      // saveNow with no pending changes shouldn't reschedule anything.
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe("validation gate", () => {
    it("does not fire onSave when draft is invalid", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false }));

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onSave).not.toHaveBeenCalled();
    });

    it("reports status='invalid' when dirty + invalid", () => {
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs() }
      );

      expect(result.current.status).toBe("saved");

      rerender(baseArgs({ draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false }));

      expect(result.current.status).toBe("invalid");
    });

    it("schedules and fires save when draft becomes valid again", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      // Become invalid
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false }));
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onSave).not.toHaveBeenCalled();

      // Become valid
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it("saveNow reports status='invalid' instead of saving when invalid", () => {
      const onSave = jest.fn();
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false }));

      act(() => {
        result.current.saveNow();
      });

      expect(onSave).not.toHaveBeenCalled();
      expect(result.current.status).toBe("invalid");
    });
  });

  describe("in-flight coalescing", () => {
    it("does not fire a second onSave while one is in flight", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      // First save fires
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true, isSaving: false }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(1);

      // Save in flight + new edit
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(1); // still just one — second is queued
    });

    it("fires one trailing save after isSaving flips false", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true, isSaving: true }) }
      );

      // Edit during in-flight save
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true }));

      // Save completes
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: false }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenLastCalledWith({ id: "e1", name: "v2" });
    });

    it("fires only ONE trailing save even if multiple edits occur during in-flight save", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true, isSaving: true }) }
      );

      // Multiple edits during in-flight save
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true }));
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v3" }, hasPendingChanges: true, isSaving: true }));
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v4" }, hasPendingChanges: true, isSaving: true }));

      // Save completes
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v4" }, hasPendingChanges: true, isSaving: false }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenLastCalledWith({ id: "e1", name: "v4" });
    });

    it("transitions to 'saved' when trailing flag is set but draft is no longer pending+valid", () => {
      const onSave = jest.fn();
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      // Step 1: User edits e1 → debounce fires → first save dispatched (call count 1)
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(1);

      // Step 2: Save in flight; user edits again → debounce effect sets trailingSaveNeededRef=true
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true }));

      // Step 3: Parent clears hasPendingChanges before save completes — e.g., a Redux
      // action that overwrites the local draft (collaborative-edit patch) or a different
      // optimistic UI clear. Note: useSaveCompletionDetector cannot produce this state
      // because it only clears the flag at the saving→not-saving transition.
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: false, isSaving: true }));

      // Step 4: Save completes. trailingSaveNeededRef=true but hasPendingRef=false → the
      // fallthrough branch fires setStatus("saved") instead of dispatchSave(). The
      // critical regression assertion: no SPURIOUS second save fires.
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: false, isSaving: false }));

      expect(onSave).toHaveBeenCalledTimes(1); // still just the one from Step 1
      expect(result.current.status).toBe("saved");
      expect(result.current.lastSavedAt).not.toBeNull();
    });
  });

  describe("element-switch flush", () => {
    it("flushes pending edit when elementId changes", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      // Pending edit on element e1
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, elementId: "e1" }));
      // Note: do NOT advance timers — switch happens before debounce expires

      // Switch to element e2 — useFormSync's setLocalDraft is queued for next
      // render, so this render still carries the old draft. The flush effect
      // captures it via draftRef.current.
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, elementId: "e2" }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({ id: "e1", name: "edited" });

      // Simulate the next render after useFormSync replaces the draft with e2's
      // data. The flush should NOT fire again — there's nothing pending on e2.
      rerender(baseArgs({ onSave, draft: { id: "e2", name: "fresh" }, hasPendingChanges: false, elementId: "e2" }));

      expect(onSave).toHaveBeenCalledTimes(1); // still just the one flush
      expect(onSave).toHaveBeenCalledWith({ id: "e1", name: "edited" });
    });

    it("does not flush when elementId changes with no pending changes", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave, elementId: "e1" }) }
      );

      rerender(baseArgs({ onSave, elementId: "e2" }));

      expect(onSave).not.toHaveBeenCalled();
    });

    it("does not flush when elementId changes while invalid", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false, elementId: "e1" }));
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false, elementId: "e2" }));

      expect(onSave).not.toHaveBeenCalled();
    });

    it("cancels any pending debounce timer on element switch", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave, elementId: "e1" }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, elementId: "e1" }));
      // Switch before timer expires
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, elementId: "e2" }));

      expect(onSave).toHaveBeenCalledTimes(1); // flush only

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onSave).toHaveBeenCalledTimes(1); // no extra fire from old timer
    });

    // C1 — element-switch + in-flight save + trailing edit must not lose data
    it("captures and drains pending flush when element switches mid-save", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      // Step 1: User edits element e1 → debounce expires → save fires
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true, elementId: "e1" }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenLastCalledWith({ id: "e1", name: "v1" });

      // Step 2: Save in flight (parent set isSaving=true). User edits e1 again.
      // Debounce effect sets trailingSaveNeededRef=true, no second dispatch.
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true, elementId: "e1" }));
      expect(onSave).toHaveBeenCalledTimes(1);

      // Step 3: User clicks element e2 BEFORE the in-flight save completes.
      // The element-switch effect should capture the pending draft for the previous
      // element so it can be drained later. (In real usage useFormSync's
      // setLocalDraft is queued for the NEXT render; on this render draftRef.current
      // is still the OLD draft.)
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true, elementId: "e2" }));
      expect(onSave).toHaveBeenCalledTimes(1);

      // Step 4: useFormSync now updates localDraft to e2's data on the next render.
      rerender(baseArgs({ onSave, draft: { id: "e2", name: "fresh" }, hasPendingChanges: false, isSaving: true, elementId: "e2" }));
      expect(onSave).toHaveBeenCalledTimes(1);

      // Step 5: In-flight save completes (parent sets isSaving=false).
      // The saving-transition effect should drain the captured pending flush →
      // onSave fires with the OLD element's pending edit ({ id: "e1", name: "v2" }).
      rerender(baseArgs({ onSave, draft: { id: "e2", name: "fresh" }, hasPendingChanges: false, isSaving: false, elementId: "e2" }));

      expect(onSave).toHaveBeenCalledTimes(2);
      expect(onSave).toHaveBeenLastCalledWith({ id: "e1", name: "v2" });
    });
  });

  describe("unmount flush", () => {
    it("fires onSave when unmounted with pending edits", () => {
      const onSave = jest.fn();
      const { rerender, unmount } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));
      // Unmount before debounce expires
      unmount();

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({ id: "e1", name: "edited" });
    });

    it("does not fire onSave on unmount when no pending edits", () => {
      const onSave = jest.fn();
      const { unmount } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      unmount();

      expect(onSave).not.toHaveBeenCalled();
    });

    it("does not fire onSave on unmount when invalid", () => {
      const onSave = jest.fn();
      const { rerender, unmount } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false }));
      unmount();

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe("status state machine and lastSavedAt", () => {
    it("starts in 'saved' with lastSavedAt null", () => {
      const { result } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs() }
      );

      expect(result.current.status).toBe("saved");
      expect(result.current.lastSavedAt).toBeNull();
    });

    it("transitions saved → saving → saved on a successful save", () => {
      const onSave = jest.fn();
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));

      // Debounce expires → dispatchSave sets status='saving'
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current.status).toBe("saving");

      // Parent reflects in-flight save
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isSaving: true }));
      expect(result.current.status).toBe("saving");

      // Save completes — parent sets isSaving=false AND useSaveCompletionDetector
      // clears hasPendingChanges. In real usage these arrive in separate renders;
      // combining them here is safe because the transition effect reads hasPendingRef
      // (updated synchronously per render) rather than isSaving's React state.
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: false, isSaving: false }));
      expect(result.current.status).toBe("saved");
      expect(result.current.lastSavedAt).not.toBeNull();
    });

    it("updates lastSavedAt timestamp after successful save", () => {
      const onSave = jest.fn();
      const fixedNow = 1_700_000_000_000;
      jest.spyOn(Date, "now").mockReturnValue(fixedNow);

      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isSaving: true }));
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: false, isSaving: false }));

      expect(result.current.lastSavedAt).toBe(fixedNow);
    });
  });

  describe("error handling", () => {
    it("transitions to 'error' when onSave throws", () => {
      // Suppress console.error noise: dispatchSave (and the unmount flush on
      // test cleanup) intentionally log when onSave throws. afterEach restores
      // the spy via jest.restoreAllMocks().
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const onSave = jest.fn().mockImplementation(() => {
        throw new Error("save failed");
      });
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(result.current.status).toBe("error");
      expect(consoleErrorSpy).toHaveBeenCalled(); // verify the diagnostic logging fired
    });

    it("retries on next edit after a thrown save", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const onSave = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error("save failed");
        })
        .mockImplementationOnce(() => {
          /* success */
        });

      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      // First edit → fails
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(1);

      // Second edit → succeeds
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(2);
      expect(onSave).toHaveBeenLastCalledWith({ id: "e1", name: "v2" });

      // Suppression spy is auto-restored by afterEach's jest.restoreAllMocks()
      void consoleErrorSpy;
    });
  });

});
