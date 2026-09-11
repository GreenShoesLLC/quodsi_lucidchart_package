// ModelEditor's States tab mounts Studio's shared StatesEditor (via
// StatesTab) over the Model editor's referenceData accessor (spec 2026-09-11
// States).
//
// NOT stubbed: the accessor (real createReferenceDataAccessor via
// useReferenceDataAccessor) and the Studio StatesEditor. Stubbed: the message
// senders (updateStates is the seam we assert on), the Basic tab's autosave
// hooks, and useMessaging (StatesTab reads its pageId -- final fix wave I2 --
// with a stable id here since page-switch remount is StatesTab's own test).

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ModelEditor from "../ModelEditor";
import { setView } from "quodsi_studio/platforms/shared";

const { updateStates, updateElementData } = vi.hoisted(() => ({
  updateStates: vi.fn(async (_states: unknown[]) => {}),
  updateElementData: vi.fn(),
}));

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ selection: { documentContext: { pageId: "page-1" } } }),
}));

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(async () => {}),
    updateStates,
    selectElement: vi.fn(),
    updateElementData,
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

const UNIT_PRICE = { id: "unit_price_ENTITY_1", name: "unit_price", componentType: "entity", dataType: "number", initialValue: 0, collectStatistics: true };
const TOTAL = { id: "total_MODEL_1", name: "total", componentType: "model", dataType: "number", initialValue: 0, collectStatistics: true };

// Shaped like referenceDataBuilder output: activity actions are SUMMARIES that
// carry modifications (with expressions) -- enough for the formula warning.
function referenceData() {
  return {
    states: [UNIT_PRICE, TOTAL],
    activities: [
      {
        id: "activity_1",
        name: "Checkout",
        actions: [
          {
            id: "action_1",
            type: "assign",
            modifications: [{ stateId: TOTAL.id, operation: "assign", expression: "qty * unit_price" }],
          },
        ],
      },
    ],
    generators: [{ id: "gen_1", name: "Arrivals", initialStates: [{ stateId: UNIT_PRICE.id, operation: "assign", value: 1 }] }],
    connectors: [],
    resources: [],
    resourceRequirements: [],
    entities: [],
  } as any;
}

const baseProps = {
  model: { id: "m1", name: "My Model", replications: 1, seed: 12345, levers: [] } as any,
  onSave: vi.fn(),
  states: {} as any,
  entities: [],
  activeTab: "states" as const,
};

describe("ModelEditor — States tab uses the shared editor", () => {
  // model.tab.states is 'intermediate' in quodsi_shared/src/views/catalog.ts.
  beforeEach(() => {
    setView("intermediate");
    updateStates.mockClear();
    updateElementData.mockClear();
  });
  afterEach(() => setView("basic"));

  it("shows a loading line and no editor before referenceData carries states", () => {
    render(
      <ModelEditor
        {...baseProps}
        referenceData={{
          activities: [],
          generators: [],
          entities: [],
          resources: [],
          resourceRequirements: [],
          connectors: [],
        } as any}
      />
    );

    expect(screen.getByText(/Loading/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add State" })).toBeNull();
  });

  it("renders the shared editor with Lucid's host wording and the formula warning", () => {
    render(<ModelEditor {...baseProps} referenceData={referenceData()} />);

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

  it("deletes through updateStates only -- the host owns the reference cascade", async () => {
    render(<ModelEditor {...baseProps} referenceData={referenceData()} />);

    fireEvent.click(screen.getByLabelText("Delete unit_price"));
    fireEvent.click(screen.getByRole("button", { name: "Delete State" }));

    await waitFor(() => expect(updateStates).toHaveBeenCalledTimes(1));
    const sent = updateStates.mock.calls[0][0] as Array<{ id: string }>;
    expect(sent.map((s) => s.id)).toEqual([TOTAL.id]);
    expect(updateElementData).not.toHaveBeenCalled();
    // gen_1's initialStates sets unit_price directly, so with 'client' the
    // panel would cascade into gen_1 via accessor.updateShape, which has no
    // updateElement sender configured here and throws before updateStates is
    // ever called -- surfacing as role="alert" instead of a clean single
    // updateStates call. Only referenceCleanup="host" reaches this state.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a rejected states write keeps the dialog open with the error", async () => {
    updateStates.mockRejectedValueOnce(new Error("Current page not available"));
    render(<ModelEditor {...baseProps} referenceData={referenceData()} />);

    fireEvent.click(screen.getByLabelText("Delete unit_price"));
    fireEvent.click(screen.getByRole("button", { name: "Delete State" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Current page not available");
    expect(screen.getByRole("button", { name: "Delete State" })).toBeInTheDocument();
  });
});
