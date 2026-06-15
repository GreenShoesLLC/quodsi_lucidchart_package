// @quodsi/lucid-shared (pulled in transitively) loads shared/dist/services/
// lucidApi.js -> axios ESM, which CRA's Jest transformer can't parse.
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";

jest.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
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
  generator: { id: "g1", name: "Arrivals", generationConfig: {}, levers: [] } as any,
  onSave: jest.fn(),
  states: {} as any,
  onStatesChange: jest.fn(),
  referenceData: {} as any,
  onTimePatternsChange: jest.fn(),
  onTimeDistributedConfigsChange: jest.fn(),
};

describe("GeneratorEditor — scenario lever authoring", () => {
  it("renders the lever-authoring section with the Generator numeric properties", () => {
    render(<GeneratorEditor {...baseProps} />);
    expect(screen.getByTestId("lever-authoring")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /scenario levers/i }));
    expect(
      screen.getByLabelText(/use Max Entities as a scenario lever/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/use Entities Per Creation as a scenario lever/i)
    ).toBeInTheDocument();
  });
});
