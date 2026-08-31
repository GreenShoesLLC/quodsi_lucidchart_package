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

// Task 10: GeneratorEditor now calls useModelRootSource() directly, which
// needs useMessaging() for its panelType. Mock it the same way
// GeneratorEditor.pattern.test.tsx does -- without this, render() throws
// (no MessageProvider ancestor in this test).
vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" } }),
}));

const baseProps = {
  generator: { id: "g1", name: "Arrivals", generationConfig: {}, levers: [] } as any,
  onSave: vi.fn(),
  states: {} as any,
  onStatesChange: vi.fn(),
  referenceData: {} as any,
};


// Levers moved off the Basic/Settings tab onto their own (2026-08-31), and Lucid
// dropped its fork of the section for the monorepo original at the same time. The
// tab strip is icon-only, so `title` is the accessible name -- these buttons are
// selected by their tooltip text, like every other Lucid tab. Once on the tab the
// section renders FLAT: there is no disclosure left to expand.
const LEVERS_TAB_NAME = /mark .* as a scenario lever/i

describe("GeneratorEditor — scenario lever authoring", () => {
  it("renders the lever-authoring section with the Generator numeric properties", () => {
    render(<GeneratorEditor {...baseProps} />);
    // Not on Settings any more.
    expect(screen.queryByTestId("lever-authoring")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: LEVERS_TAB_NAME }));
    expect(screen.getByTestId("lever-authoring")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/use Entities Per Creation as a scenario lever/i)
    ).toBeInTheDocument();
    // Max Entities was removed as a generator scenario lever (per request).
    expect(
      screen.queryByLabelText(/use Max Entities as a scenario lever/i)
    ).not.toBeInTheDocument();
  });
});
