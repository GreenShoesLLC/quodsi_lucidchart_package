import React from "react";
import { render, screen, within, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { EnvelopeMessageType, SimulationObjectType } from "@quodsi/lucid-shared";
import { setView } from "quodsi_studio/platforms/shared";
import { resetModelRootWritesForTests } from "../../../adapters/modelRootWrites";

// This file predates Complexity Views and exercises the shared
// ConnectorRoutingView's State Condition / Entity Template modes, both
// 'intermediate' in the catalog. Pin the view for every test here rather
// than weaken any assertion -- view-gating itself is covered by
// viewGating.test.tsx / Studio's own viewFieldGating.test.tsx.
beforeEach(() => setView("intermediate"));
afterEach(() => {
  cleanup();
  resetModelRootWritesForTests();
  vi.restoreAllMocks();
  setView("basic");
});

// vi.hoisted keeps ONE stable spy the mock factory can close over, so the
// Levers-tab test below can assert the write reached the ELEMENT_UPDATE sender.
const { mockUpdateElement } = vi.hoisted(() => ({
  mockUpdateElement: vi.fn(async () => {}),
}));

const messaging = vi.hoisted(() => ({ current: {} as any }));
vi.mock("../../../messaging/MessageProvider", () => ({ useMessaging: () => messaging.current }));
vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(async () => {}),
    updateElement: mockUpdateElement,
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}));

import { ElementEditor } from "../ElementEditor";

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
  entities: [],
};

// The Connector case reads through the composite element-editor accessor
// (LucidConnectorEditor, 2026-11-06), so it waits for the model-root snapshot.
// This host answers every MODEL_ROOT_REQUEST with the given reference data.
function installHost(data: any = referenceData) {
  messaging.current = {
    app: { panelType: "model" },
    selection: { lastUpdated: 1, documentContext: { pageId: "page-1" } },
    sendMessage: vi.fn(),
  };
  vi.spyOn(window.parent, "postMessage").mockImplementation((envelope: any) => {
    if (envelope?.type !== EnvelopeMessageType.MODEL_ROOT_REQUEST) return;
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          id: envelope.id,
          type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
          source: "host",
          target: "model-iframe",
          version: "1.0",
          data: {
            projection: {
              pageId: "page-1",
              generators: data.generators, activities: data.activities, connectors: data.connectors,
              entities: data.entities, states: data.states,
              arrivalPatterns: [], arrivalSchedules: [], model: {},
            },
          },
        },
      }),
    );
  });
}

describe("ElementEditor — case Connector renders the shared ConnectorEditor", () => {
  it("generator-sourced connector: renders the shared view, highlights the selected card, no forked notice", async () => {
    installHost();
    render(
      <ElementEditor
        {...baseProps}
        elementType={SimulationObjectType.Connector}
        elementData={{ id: "c1", type: "Connector", sourceId: "gen-1", targetId: "a1" }}
      />
    );

    const select = await screen.findByRole("combobox");
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Probability",
      "State Condition",
      "Entity Template",
      "First Available",
    ]);

    const selectedCard = screen.getByTestId("connector-routing-card-c1");
    expect(selectedCard).toBeInTheDocument();
    expect(selectedCard).toHaveAttribute("aria-current", "true");

    const otherCard = screen.getByTestId("connector-routing-card-c2");
    expect(otherCard).not.toHaveAttribute("aria-current");

    expect(
      screen.queryByText(/Generator connectors are simple point-to-point connections/)
    ).not.toBeInTheDocument();
  });

  it("activity-sourced connector: renders the shared view too", async () => {
    const withC3 = {
      ...referenceData,
      connectors: [
        ...referenceData.connectors,
        { id: "c3", sourceId: "a1", targetId: "a2", weight: 1 },
      ],
    };
    installHost(withC3);
    render(
      <ElementEditor
        {...baseProps}
        elementType={SimulationObjectType.Connector}
        elementData={{ id: "c3", type: "Connector", sourceId: "a1", targetId: "a2" }}
        referenceData={withC3}
      />
    );

    expect(await screen.findByRole("combobox")).toBeInTheDocument();
    expect(screen.getByTestId("connector-routing-card-c3")).toBeInTheDocument();
  });

  // 2026-09-03 (Renee's Basic review): the Connector case now renders the
  // shared ConnectorEditor, which carries Routing | Levers tabs. The Weight
  // lever left the routing card for that Levers tab in both hosts at once --
  // the card here is the same shared component Studio/drawio render.
  it("carries Routing and Levers tabs, and the routing card no longer holds lever authoring", async () => {
    setView("basic");
    installHost();
    render(
      <ElementEditor
        {...baseProps}
        elementType={SimulationObjectType.Connector}
        elementData={{ id: "c1", type: "Connector", sourceId: "gen-1", targetId: "a1" }}
      />
    );
    expect(await screen.findByRole("tab", { name: "Routing" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Levers" })).toBeInTheDocument();
    expect(screen.getByTestId("connector-routing-card-c1")).toBeInTheDocument();
    expect(screen.queryByTestId("lever-authoring")).not.toBeInTheDocument();
  });

  it("authors a Weight lever from the Levers tab through the ELEMENT_UPDATE sender", async () => {
    mockUpdateElement.mockClear();
    installHost();
    render(
      <ElementEditor
        {...baseProps}
        elementType={SimulationObjectType.Connector}
        elementData={{ id: "c1", type: "Connector", sourceId: "gen-1", targetId: "a1" }}
      />
    );
    fireEvent.click(await screen.findByRole("tab", { name: "Levers" }));
    fireEvent.click(screen.getByLabelText(/use Weight as a scenario lever/i));
    // The adapter sends after an optimistic overlay + notify, so the call
    // lands a tick later (same waitFor the seam tests use).
    await waitFor(() => expect(mockUpdateElement).toHaveBeenCalled());
    expect(mockUpdateElement).toHaveBeenCalledWith(
      "c1",
      expect.any(String),
      expect.objectContaining({
        levers: [expect.objectContaining({ path: 'weight', op: 'set' })],
      })
    );
  });
});
