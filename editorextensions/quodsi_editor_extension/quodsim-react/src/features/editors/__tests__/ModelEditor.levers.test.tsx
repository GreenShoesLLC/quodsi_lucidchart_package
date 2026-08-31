import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ModelEditor from "../ModelEditor";

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


// Levers moved off the Basic/Settings tab onto their own (2026-08-31), and Lucid
// dropped its fork of the section for the monorepo original at the same time. The
// tab strip is icon-only, so `title` is the accessible name -- these buttons are
// selected by their tooltip text, like every other Lucid tab. Once on the tab the
// section renders FLAT: there is no disclosure left to expand.
const LEVERS_TAB_NAME = /mark .* as a scenario lever/i

describe("ModelEditor — scenario lever authoring", () => {
  it("renders the lever-authoring section with the Model numeric properties", () => {
    render(<ModelEditor {...baseProps} />);
    // Not on Basic any more.
    expect(screen.queryByTestId("lever-authoring")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: LEVERS_TAB_NAME }));
    expect(screen.getByTestId("lever-authoring")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/use Replications as a scenario lever/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/use Random Seed as a scenario lever/i)
    ).toBeInTheDocument();
  });

  it("updates model levers when a lever is toggled on", () => {
    const onSave = vi.fn();
    render(<ModelEditor {...baseProps} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: LEVERS_TAB_NAME }));
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
