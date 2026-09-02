import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ModelEditor from "../ModelEditor";
import { setView } from "quodsi_studio/platforms/shared";
// Replications, Time Mode, Clock Unit and Warmup all moved to the
// INTERMEDIATE view on 2026-09-01 (Renee's simple-version spec: a Basic
// model's Basic tab is Model Name + Run Time). This file pins field
// BEHAVIOUR, not gating, so it asks for a view that renders the fields.
// The gating itself lives in viewGating.test.tsx.
beforeEach(() => setView('intermediate'));
afterEach(() => setView('basic'));


vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(),
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}));

vi.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

vi.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: vi.fn() }),
  useFlushOnChange: () => {},
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

const baseProps = {
  model: { id: "m1", name: "My Model", reps: 1, seed: 12345, levers: [] } as any,
  onSave: vi.fn(),
  states: {} as any,
  onStatesChange: vi.fn(),
  entities: [],
  onEntitiesChange: vi.fn(),
};

describe("ModelEditor — Replications cap", () => {
  // Reps lives in the (collapsed-by-default) Advanced Settings accordion.
  const expandAdvanced = () =>
    fireEvent.click(screen.getByRole("button", { name: /advanced settings/i }));

  it("advertises the cap via the input max attribute", () => {
    render(<ModelEditor {...baseProps} />);
    expandAdvanced();
    expect(screen.getByTestId("reps-input")).toHaveAttribute("max", "100");
  });

  it("clamps a value above the cap down to 100", () => {
    render(<ModelEditor {...baseProps} />);
    expandAdvanced();
    const input = screen.getByTestId("reps-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "150" } });
    expect(input.value).toBe("100");
  });
});
