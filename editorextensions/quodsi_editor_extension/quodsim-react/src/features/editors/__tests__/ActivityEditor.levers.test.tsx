import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ActivityEditor from "../ActivityEditor";

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
  activity: { id: "a1", name: "Triage", capacity: 1, actions: [], levers: [] } as any,
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

describe("ActivityEditor — scenario lever authoring", () => {
  it("renders the lever-authoring section with the Activity numeric properties", () => {
    render(<ActivityEditor {...baseProps} />);
    // Not on Basic any more.
    expect(screen.queryByTestId("lever-authoring")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: LEVERS_TAB_NAME }));
    expect(screen.getByTestId("lever-authoring")).toBeInTheDocument();
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

  it("offers a Seize-priority lever for a SEIZE action with a resource requirement", () => {
    render(
      <ActivityEditor
        {...baseProps}
        activity={{
          id: "a1",
          name: "Triage",
          capacity: 1,
          levers: [],
          actions: [
            { id: "act-seize-1", type: "seize", name: "Seize Nurse", resourceRequirementId: "req-nurse" },
          ],
        } as any}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: LEVERS_TAB_NAME }));
    expect(screen.getByLabelText(/use seize nurse's priority as a scenario lever/i)).toBeInTheDocument();
  });
});
