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
  });
});
