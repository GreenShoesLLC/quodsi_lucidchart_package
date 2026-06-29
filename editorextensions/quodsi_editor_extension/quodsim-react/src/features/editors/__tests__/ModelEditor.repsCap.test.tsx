// @quodsi/lucid-shared (pulled in transitively) loads shared/dist/services/
// lucidApi.js -> axios ESM, which CRA's Jest transformer can't parse.
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ModelEditor from "../ModelEditor";

jest.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: jest.fn(),
    selectElement: jest.fn(),
    updateElementData: jest.fn(),
  }),
}));

jest.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

jest.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: jest.fn() }),
  useFlushOnChange: () => {},
}));

jest.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

const baseProps = {
  model: { id: "m1", name: "My Model", reps: 1, seed: 12345, levers: [] } as any,
  onSave: jest.fn(),
  states: {} as any,
  onStatesChange: jest.fn(),
  entities: [],
  onEntitiesChange: jest.fn(),
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
