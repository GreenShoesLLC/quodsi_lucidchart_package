// @quodsi/lucid-shared (pulled in transitively) loads shared/dist/services/
// lucidApi.js -> axios ESM, which CRA's Jest transformer can't parse.
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ActivityEditor from "../ActivityEditor";

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
  activity: { id: "a1", name: "Triage", capacity: 1, actions: [], levers: [] } as any,
  onSave: jest.fn(),
  states: {} as any,
  onStatesChange: jest.fn(),
  referenceData: {} as any,
};

describe("ActivityEditor — scenario lever authoring", () => {
  it("renders the lever-authoring section with the Activity numeric properties", () => {
    render(<ActivityEditor {...baseProps} />);
    expect(screen.getByTestId("lever-authoring")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /scenario levers/i }));
    expect(
      screen.getByLabelText(/use Activity Capacity as a scenario lever/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/use Inbound Queue Capacity as a scenario lever/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/use Outbound Queue Capacity as a scenario lever/i)
    ).toBeInTheDocument();
  });
});
