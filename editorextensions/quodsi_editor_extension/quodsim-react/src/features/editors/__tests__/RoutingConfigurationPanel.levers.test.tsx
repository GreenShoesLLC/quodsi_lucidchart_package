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

  it("renders the WEIGHT lever-authoring section for connectors (2+ connectors)", () => {
    render(<RoutingConfigurationPanel {...baseProps} />);
    // One section per connector
    expect(screen.getAllByTestId("lever-authoring").length).toBe(2);
    // WEIGHT property display label = "Weight"
    expect(
      screen.getAllByLabelText(/use Weight as a scenario lever/i).length
    ).toBe(2);
  });

  it("enabling the WEIGHT lever writes a connector with a non-empty levers array", () => {
    render(<RoutingConfigurationPanel {...baseProps} />);
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
