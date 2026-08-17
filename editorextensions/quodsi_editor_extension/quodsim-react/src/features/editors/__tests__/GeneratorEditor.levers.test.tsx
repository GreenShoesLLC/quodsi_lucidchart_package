// @quodsi/lucid-shared (pulled in transitively) loads shared/dist/services/
// lucidApi.js -> axios ESM, which CRA's Jest transformer can't parse.
vi.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
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
  generator: { id: "g1", name: "Arrivals", generationConfig: {}, levers: [] } as any,
  onSave: vi.fn(),
  states: {} as any,
  onStatesChange: vi.fn(),
  referenceData: {} as any,
};

describe("GeneratorEditor — scenario lever authoring", () => {
  it("renders the lever-authoring section with the Generator numeric properties", () => {
    render(<GeneratorEditor {...baseProps} />);
    expect(screen.getByTestId("lever-authoring")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /scenario levers/i }));
    expect(
      screen.getByLabelText(/use Entities Per Creation as a scenario lever/i)
    ).toBeInTheDocument();
    // Max Entities was removed as a generator scenario lever (per request).
    expect(
      screen.queryByLabelText(/use Max Entities as a scenario lever/i)
    ).not.toBeInTheDocument();
  });
});
