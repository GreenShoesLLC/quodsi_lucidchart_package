import React from "react";
import { render, screen, within } from "@testing-library/react";
import { ElementEditor } from "../ElementEditor";
import { SimulationObjectType, StateListManager } from "@quodsi/lucid-shared";

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(async () => {}),
    updateElement: vi.fn(async () => {}),
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

describe("ElementEditor — case Connector renders ConnectorRoutingView", () => {
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
});
