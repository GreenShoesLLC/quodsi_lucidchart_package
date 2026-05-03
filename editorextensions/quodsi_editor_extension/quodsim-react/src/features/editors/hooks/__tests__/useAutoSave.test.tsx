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
});
