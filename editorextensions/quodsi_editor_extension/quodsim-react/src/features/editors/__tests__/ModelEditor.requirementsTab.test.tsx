import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelEditor from "../ModelEditor";

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(async () => {}),
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

const referenceData = {
  resources: [{ id: "doc", name: "Doctor" }],
  resourceRequirements: [
    { id: "doc", name: "Doctor", rootClause: { id: "c", mode: "require_all", requests: [{ resourceId: "doc" }] } },
    {
      id: "req-1",
      name: "Triage team",
      rootClause: {
        id: "r",
        mode: "require_any",
        requests: [{ resourceId: "doc" }, { resourceId: "doc", quantity: 2 }],
      },
    },
  ],
  activities: [{ id: "a1", name: "Intake", actions: [{ id: "x", type: "seize", resourceRequirementId: "req-1" }] }],
} as any;

describe("ModelEditor — Requirements tab uses the shared editor", () => {
  it("lists custom first with usage, then the resource row with the Resource pill", async () => {
    const user = userEvent.setup();
    render(<ModelEditor {...baseProps} referenceData={referenceData} activeTab="requirements" />);
    expect(screen.getByRole("button", { name: "Add New" })).toBeInTheDocument();
    const rows = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(rows).toEqual(["Triage team", "Doctor"]);
    expect(screen.getByText("1 step")).toBeInTheDocument();
    expect(screen.getByText("Resource")).toBeInTheDocument(); // the renamed pill
    expect(screen.queryByText(/Templates/)).not.toBeInTheDocument(); // Lucid's tab is gone
    await user.click(screen.getByRole("button", { name: "Add New" }));
    expect(screen.getByRole("dialog", { name: "New requirement" })).toBeInTheDocument();
  });
});
