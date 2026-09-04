import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { ElementEditor } from "../ElementEditor";
import { SimulationObjectType, StateListManager, ScenarioPropertyName } from "@quodsi/lucid-shared";
import { setView } from "quodsi_studio/platforms/shared";

// This file predates Complexity Views and exercises the shared
// ConnectorRoutingView's State Condition / Entity Template modes, both
// 'intermediate' in the catalog. Pin the view for every test here rather
// than weaken any assertion -- view-gating itself is covered by
// viewGating.test.tsx / Studio's own viewFieldGating.test.tsx.
beforeEach(() => setView("intermediate"));
afterEach(() => setView("basic"));

// vi.hoisted keeps ONE stable spy the mock factory can close over, so the
// Levers-tab test below can assert the write reached the ELEMENT_UPDATE sender.
const { mockUpdateElement } = vi.hoisted(() => ({
  mockUpdateElement: vi.fn(async () => {}),
}));

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(async () => {}),
    updateElement: mockUpdateElement,
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}));

const referenceData = {
  activities: [
    { id: "a1", name: "Intake", routing: "probability" },
    { id: "a2", name: "Exam" },
  ],
  generators: [{ id: "gen-1", name: "Door", routing: "probability" }],
  connectors: [
    { id: "c1", sourceId: "gen-1", targetId: "a1", weight: 1 },
    { id: "c2", sourceId: "gen-1", targetId: "a2", weight: 1 },
  ],
  entities: [],
  states: [],
  resources: [],
  resourceRequirements: [],
} as any;

const baseProps = {
  onSave: vi.fn(),
  referenceData,
  states: new StateListManager(),
  onStatesChange: vi.fn(),
  entities: [],
  onEntitiesChange: vi.fn(),
};

describe("ElementEditor — case Connector renders the shared ConnectorEditor", () => {
  it("generator-sourced connector: renders the shared view, highlights the selected card, no forked notice", () => {
    render(
      <ElementEditor
        {...baseProps}
        elementType={SimulationObjectType.Connector}
        elementData={{ id: "c1", type: "Connector", sourceId: "gen-1", targetId: "a1" }}
      />
    );

    const select = screen.getByRole("combobox");
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Probability",
      "State Condition",
      "Entity Template",
      "First Available",
    ]);

    const selectedCard = screen.getByTestId("connector-routing-card-c1");
    expect(selectedCard).toBeInTheDocument();
    expect(selectedCard.className).toMatch(/ring-2/);

    const otherCard = screen.getByTestId("connector-routing-card-c2");
    expect(otherCard.className).not.toMatch(/ring-2/);

    expect(
      screen.queryByText(/Generator connectors are simple point-to-point connections/)
    ).not.toBeInTheDocument();
  });

  it("activity-sourced connector: renders the shared view too", () => {
    render(
      <ElementEditor
        {...baseProps}
        elementType={SimulationObjectType.Connector}
        elementData={{ id: "c3", type: "Connector", sourceId: "a1", targetId: "a2" }}
        referenceData={{
          ...referenceData,
          connectors: [
            ...referenceData.connectors,
            { id: "c3", sourceId: "a1", targetId: "a2", weight: 1 },
          ],
        }}
      />
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByTestId("connector-routing-card-c3")).toBeInTheDocument();
  });

  // 2026-09-03 (Renee's Basic review): the Connector case now renders the
  // shared ConnectorEditor, which carries Routing | Levers tabs. The Weight
  // lever left the routing card for that Levers tab in both hosts at once --
  // the card here is the same shared component Studio/drawio render.
  it("carries Routing and Levers tabs, and the routing card no longer holds lever authoring", () => {
    setView("basic");
    render(
      <ElementEditor
        {...baseProps}
        elementType={SimulationObjectType.Connector}
        elementData={{ id: "c1", type: "Connector", sourceId: "gen-1", targetId: "a1" }}
      />
    );
    expect(screen.getByRole("tab", { name: "Routing" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Levers" })).toBeInTheDocument();
    expect(screen.getByTestId("connector-routing-card-c1")).toBeInTheDocument();
    expect(screen.queryByTestId("lever-authoring")).not.toBeInTheDocument();
  });

  it("authors a Weight lever from the Levers tab through the ELEMENT_UPDATE sender", async () => {
    mockUpdateElement.mockClear();
    render(
      <ElementEditor
        {...baseProps}
        elementType={SimulationObjectType.Connector}
        elementData={{ id: "c1", type: "Connector", sourceId: "gen-1", targetId: "a1" }}
      />
    );
    fireEvent.click(screen.getByRole("tab", { name: "Levers" }));
    fireEvent.click(screen.getByLabelText(/use Weight as a scenario lever/i));
    // The adapter sends after an optimistic overlay + notify, so the call
    // lands a tick later (same waitFor the seam tests use).
    await waitFor(() => expect(mockUpdateElement).toHaveBeenCalled());
    expect(mockUpdateElement).toHaveBeenCalledWith(
      "c1",
      expect.any(String),
      expect.objectContaining({
        levers: [expect.objectContaining({ propertyName: ScenarioPropertyName.WEIGHT })],
      })
    );
  });
});
