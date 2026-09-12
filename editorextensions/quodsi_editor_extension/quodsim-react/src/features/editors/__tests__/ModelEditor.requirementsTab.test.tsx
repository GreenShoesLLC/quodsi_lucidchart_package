// ModelEditor's Requirements tab: Studio's shared ResourceRequirementsEditor
// on the editor's ONE model-root accessor, in host-cleanup mode (spec
// 2026-09-12). The delete dialog counts levers because the snapshot's activity
// summaries now carry them.
import React from "react";
import { screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setView } from "quodsi_studio/platforms/shared";
import { definition, mountModelEditor } from "./modelEditorSeam";

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, selection: {}, sendMessage: vi.fn() }),
}));

function requirementsDefinition() {
  return definition({
    resources: [{ id: "doc", name: "Doctor" }],
    resourceRequirements: [
      { id: "doc", name: "Doctor", rootClause: { id: "c", mode: "require_all", requests: [{ resourceId: "doc" }] } },
      {
        id: "req-1",
        name: "Triage team",
        rootClause: { id: "r", mode: "require_any", requests: [{ resourceId: "doc" }, { resourceId: "doc", quantity: 2 }] },
      },
    ],
    activities: [
      {
        id: "a1",
        name: "Intake",
        actions: [{ id: "x", type: "seize", resourceRequirementId: "req-1" }],
        levers: [{ leverId: "lv-1", propertyName: "SEIZE_PRIORITY", actionId: "x" }],
      },
    ],
  });
}

describe("ModelEditor — Requirements tab uses the shared editor", () => {
  // model.tab.requirements is intermediate as of 2026-09-03.
  beforeEach(() => setView("intermediate"));
  afterEach(() => { cleanup(); setView("basic"); });

  it("lists custom first with usage, then the resource row with the Resource pill", async () => {
    const user = userEvent.setup();
    mountModelEditor(requirementsDefinition(), { props: { activeTab: "requirements" } });

    expect(screen.getByRole("button", { name: "Add New" })).toBeInTheDocument();
    const rows = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(rows).toEqual(["Triage team", "Doctor"]);
    expect(screen.getByText("1 action")).toBeInTheDocument();
    expect(screen.getByText("Resource")).toBeInTheDocument();
    expect(screen.queryByText(/Templates/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add New" }));
    expect(screen.getByRole("dialog", { name: "New requirement" })).toBeInTheDocument();
  });

  it("the delete dialog counts the steps and their levers, and sends the choice to the host", async () => {
    const user = userEvent.setup();
    const { transport } = mountModelEditor(requirementsDefinition(), { props: { activeTab: "requirements" } });

    await user.click(screen.getByTitle("Delete requirement"));
    expect(screen.getByText('Delete "Triage team"?')).toBeInTheDocument();
    expect(screen.getByText("1 Seize/Release step uses it:")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Remove the steps" }));
    expect(screen.getByText("Also removes 1 lever on them.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete Requirement" }));

    await waitFor(() => expect(transport.send).toHaveBeenCalledTimes(1));
    const [patch, basedOnPageId, options] = transport.send.mock.calls[0] as [
      { resourceRequirements: Array<{ id: string }> }, string, unknown,
    ];
    expect(Object.keys(patch)).toEqual(["resourceRequirements"]);
    expect(patch.resourceRequirements.map((r) => r.id)).not.toContain("req-1");
    expect(basedOnPageId).toBe("page-1");
    expect(options).toEqual({ seizeRelease: "remove" });
    expect(transport.saveShape).not.toHaveBeenCalled();
  });
});
