// The shared Model editor's States tab in Lucid's host: Studio's shared
// StatesEditor over the ONE model-root accessor (spec 2026-09-12, 2026-09-13).
//
// NOT stubbed: projectModelRoot, the source, the accessor, the Studio
// StatesEditor. Only the transport is faked (see modelEditorSeam).

import React from "react";
import { screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { setView } from "quodsi_studio/platforms/shared";
import { definition, mountModelEditor } from "./modelEditorSeam";

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, selection: {}, sendMessage: vi.fn() }),
}));

const UNIT_PRICE = { id: "unit_price_ENTITY_1", name: "unit_price", componentType: "entity", dataType: "number", initialValue: 0, collectStatistics: true };
const TOTAL = { id: "total_MODEL_1", name: "total", componentType: "model", dataType: "number", initialValue: 0, collectStatistics: true };

// Activity actions become SUMMARIES carrying modifications (with expressions)
// -- enough for the formula warning -- and the generator sets unit_price directly.
function statesDefinition() {
  return definition({
    states: [UNIT_PRICE, TOTAL],
    activities: [
      {
        id: "activity_1",
        name: "Checkout",
        actions: [
          { id: "action_1", type: "assign", modifications: [{ stateId: TOTAL.id, operation: "assign", expression: "qty * unit_price" }] },
        ],
      },
    ],
    generators: [{ id: "gen_1", name: "Arrivals", initialStates: [{ stateId: UNIT_PRICE.id, operation: "assign", value: 1 }] }],
  });
}

describe("Model editor — States tab uses the shared editor", () => {
  // model.tab.states is 'intermediate' in quodsi_shared/src/views/catalog.ts.
  beforeEach(() => setView("intermediate"));
  afterEach(() => { cleanup(); setView("basic"); });

  it("renders the shared editor with Lucid's host wording and the formula warning", () => {
    mountModelEditor(statesDefinition(), { props: { activeTab: "States" } });

    expect(screen.getByRole("button", { name: "Add State" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Delete unit_price"));

    expect(
      screen.getByText(/steps that set this state directly will have that reference removed automatically/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 expression references this state inside a formula and cannot be fixed automatically/)
    ).toBeInTheDocument();
    expect(screen.getByText("total = qty * unit_price")).toBeInTheDocument();
  });

  it("deletes through the model root only -- the host owns the reference cascade", async () => {
    const { transport } = mountModelEditor(statesDefinition(), { props: { activeTab: "States" } });

    fireEvent.click(screen.getByLabelText("Delete unit_price"));
    fireEvent.click(screen.getByRole("button", { name: "Delete State" }));

    await waitFor(() => expect(transport.send).toHaveBeenCalledTimes(1));
    const [patch, basedOnPageId] = transport.send.mock.calls[0] as [{ states: Array<{ id: string }> }, string];
    expect(Object.keys(patch)).toEqual(["states"]);
    expect(patch.states.map((s) => s.id)).toEqual([TOTAL.id]);
    expect(basedOnPageId).toBe("page-1");
    // gen_1 sets unit_price directly: with referenceCleanup 'client' the panel
    // would cascade into gen_1 through accessor.updateShape -> saveShape.
    expect(transport.saveShape).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a rejected states write keeps the dialog open with the error, before and after the host's corrective snapshot", async () => {
    const seam = mountModelEditor(statesDefinition(), {
      props: { activeTab: "States" },
      transport: { send: vi.fn().mockRejectedValue(new Error("Current page not available")) },
    });
    const original = seam.source.deps.getModelDefinition();

    fireEvent.click(screen.getByLabelText("Delete unit_price"));
    fireEvent.click(screen.getByRole("button", { name: "Delete State" }));
    await waitFor(() => expect(seam.transport.send).toHaveBeenCalledTimes(1));

    // The optimistic echo removed the state; the box stays and shows the rejection.
    expect(await screen.findByRole("alert")).toHaveTextContent("Current page not available");
    expect(screen.getByRole("button", { name: "Delete State" })).toBeInTheDocument();

    // The host's corrective snapshot restores the state; the box is still open under it.
    await act(async () => { seam.source.acceptSnapshot(original as never, seam.transport.send.mock.calls[0][3]); });

    expect(screen.getByRole("alert")).toHaveTextContent("Current page not available");
    const box = screen.getByTestId("inline-delete-confirm");
    expect(box.previousElementSibling).toContainElement(screen.getByLabelText("Delete unit_price"));
  });
});
