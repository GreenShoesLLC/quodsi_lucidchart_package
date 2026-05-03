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
});
