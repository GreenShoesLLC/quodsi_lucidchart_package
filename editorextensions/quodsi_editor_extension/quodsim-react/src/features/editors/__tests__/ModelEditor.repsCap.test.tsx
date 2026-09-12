import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { setView } from "quodsi_studio/platforms/shared";
import { mountModelEditor } from "./modelEditorSeam";
// Replications, Time Mode, Clock Unit and Warmup are INTERMEDIATE (2026-09-01).
// This file pins field BEHAVIOUR, so it asks for a view that renders them.
beforeEach(() => setView("intermediate"));
afterEach(() => setView("basic"));

vi.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: () => ({ status: "saved", lastSavedAt: null, saveNow: vi.fn() }),
  useFlushOnChange: () => {},
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

describe("ModelEditor — Replications cap", () => {
  // Reps lives in the (collapsed-by-default) Advanced Settings accordion.
  const expandAdvanced = () =>
    fireEvent.click(screen.getByRole("button", { name: /advanced settings/i }));

  it("advertises the cap via the input max attribute", () => {
    mountModelEditor();
    expandAdvanced();
    expect(screen.getByTestId("reps-input")).toHaveAttribute("max", "100");
  });

  it("clamps a value above the cap down to 100", () => {
    mountModelEditor();
    expandAdvanced();
    const input = screen.getByTestId("reps-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "150" } });
    expect(input.value).toBe("100");
  });
});
