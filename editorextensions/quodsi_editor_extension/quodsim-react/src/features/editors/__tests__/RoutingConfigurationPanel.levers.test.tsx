// @quodsi/lucid-shared (pulled in by RoutingConfigurationPanel.tsx) transitively
// loads shared/dist/services/lucidApi.js -> axios ESM, which CRA's Jest
// transformer can't parse. (Same pattern as ConnectorsEditor.test.tsx.)
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Connector,
  ConnectType,
  StateListManager,
  createScenarioLever,
  ScenarioPropertyName,
} from "@quodsi/lucid-shared";
import { RoutingConfigurationPanel } from "../RoutingConfigurationPanel";

// Capture the updateElementData spy so the lever write-path can be asserted.
// Must be `mock`-prefixed to be referenced inside jest.mock's factory.
const mockUpdateElementData = jest.fn();

jest.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({ updateElementData: mockUpdateElementData }),
}));

jest.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

jest.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
}));

const makeConnector = (id: string, name: string, weight: number) =>
  new Connector(
    id,
    name,
    "src",
    "tgt",
    weight,
    0,
    0,
    0,
    0,
    0,
    0
  );

const baseProps = {
  activityId: "act1",
  connectType: ConnectType.Probability,
  outgoingConnectors: [
    makeConnector("c1", "Conn One", 1),
    makeConnector("c2", "Conn Two", 1),
  ],
  entityStates: new StateListManager(),
  availableEntities: [],
  onConnectorUpdate: jest.fn(),
};

describe("RoutingConfigurationPanel — connector WEIGHT lever authoring", () => {
  beforeEach(() => {
    mockUpdateElementData.mockClear();
  });

  it("is collapsed by default — toggle present, inner WEIGHT checkbox hidden", () => {
    render(<RoutingConfigurationPanel {...baseProps} />);
    // The disclosure toggle is present (one per connector card)...
    expect(
      screen.getAllByRole("button", { name: /scenario levers/i }).length
    ).toBe(2);
    // ...but the inner WEIGHT checkbox is not rendered while collapsed.
    expect(
      screen.queryByLabelText(/use Weight as a scenario lever/i)
    ).toBeNull();
  });

  it("shows an enabled-lever count badge while collapsed", () => {
    const connectorWithLever = makeConnector("c1", "Conn One", 1);
    (connectorWithLever as any).levers = [
      createScenarioLever({
        propertyName: ScenarioPropertyName.WEIGHT,
        label: "Conn One — Weight",
        enabled: true,
      }),
    ];
    render(
      <RoutingConfigurationPanel
        {...baseProps}
        outgoingConnectors={[connectorWithLever, makeConnector("c2", "Conn Two", 1)]}
      />
    );
    // Still collapsed (no inner checkbox), but the badge surfaces the enabled lever.
    expect(
      screen.queryByLabelText(/use Weight as a scenario lever/i)
    ).toBeNull();
    expect(screen.getByTestId("lever-count")).toHaveTextContent("1");
  });

  it("renders the WEIGHT lever-authoring section for connectors (2+ connectors)", () => {
    render(<RoutingConfigurationPanel {...baseProps} />);
    // One section per connector
    expect(screen.getAllByTestId("lever-authoring").length).toBe(2);
    // Expand both sections to reveal the inner controls.
    screen
      .getAllByRole("button", { name: /scenario levers/i })
      .forEach((btn) => fireEvent.click(btn));
    // WEIGHT property display label = "Weight"
    expect(
      screen.getAllByLabelText(/use Weight as a scenario lever/i).length
    ).toBe(2);
  });

  it("enabling the WEIGHT lever writes a connector with a non-empty levers array", () => {
    render(<RoutingConfigurationPanel {...baseProps} />);
    screen
      .getAllByRole("button", { name: /scenario levers/i })
      .forEach((btn) => fireEvent.click(btn));
    const checkbox = screen.getAllByLabelText(
      /use Weight as a scenario lever/i
    )[0] as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);

    expect(mockUpdateElementData).toHaveBeenCalled();
    const lastCall =
      mockUpdateElementData.mock.calls[mockUpdateElementData.mock.calls.length - 1];
    const connectorArg = lastCall[2];
    expect(Array.isArray(connectorArg.levers)).toBe(true);
    expect(connectorArg.levers.length).toBeGreaterThan(0);
  });
});
