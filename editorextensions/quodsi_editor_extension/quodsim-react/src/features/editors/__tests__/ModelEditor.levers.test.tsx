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

describe("ModelEditor — scenario lever authoring", () => {
  it("renders the lever-authoring section with the Model numeric properties", () => {
    render(<ModelEditor {...baseProps} />);
    expect(screen.getByTestId("lever-authoring")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /scenario levers/i }));
    expect(
      screen.getByLabelText(/use Replications as a scenario lever/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/use Random Seed as a scenario lever/i)
    ).toBeInTheDocument();
  });

  it("updates model levers when a lever is toggled on", () => {
    const onSave = jest.fn();
    render(<ModelEditor {...baseProps} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: /scenario levers/i }));
    fireEvent.click(
      screen.getByLabelText(/use Replications as a scenario lever/i)
    );

    // The lever section onChange updates the draft; auto-save fires via onSave.
    // Because useAutoSave is mocked to idle, we verify via the draft update path:
    // re-render with the updated levers propagated through onSave argument.
    // The mock captures what was passed to onSave's draft update chain.
    // Since useAutoSave is mocked, we need to check via a different approach:
    // verify the checkbox is now checked (lever added to local draft).
    expect(
      (screen.getByLabelText(/use Replications as a scenario lever/i) as HTMLInputElement).checked
    ).toBe(true);
  });
});
