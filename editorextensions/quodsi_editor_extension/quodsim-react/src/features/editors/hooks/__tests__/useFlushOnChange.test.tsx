import { renderHook } from "@testing-library/react";
import { useFlushOnChange } from "../useEditorState";

describe("useFlushOnChange", () => {
  it("does not call saveNow on initial mount", () => {
    const saveNow = vi.fn();
    renderHook(({ value }) => useFlushOnChange(value, saveNow), {
      initialProps: { value: "a" },
    });
    expect(saveNow).not.toHaveBeenCalled();
  });

  it("calls saveNow when value changes", () => {
    const saveNow = vi.fn();
    const { rerender } = renderHook(
      ({ value }) => useFlushOnChange(value, saveNow),
      { initialProps: { value: "a" } }
    );
    rerender({ value: "b" });
    expect(saveNow).toHaveBeenCalledTimes(1);
  });

  it("does not call saveNow when re-rendered with the same value", () => {
    const saveNow = vi.fn();
    const { rerender } = renderHook(
      ({ value }) => useFlushOnChange(value, saveNow),
      { initialProps: { value: "a" } }
    );
    rerender({ value: "a" });
    expect(saveNow).not.toHaveBeenCalled();
  });
});
