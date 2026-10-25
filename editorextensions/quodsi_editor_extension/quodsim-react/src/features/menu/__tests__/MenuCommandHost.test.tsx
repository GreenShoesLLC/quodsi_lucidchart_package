// The extension's Quodsi menu (src/core/quodsiMenu.ts) runs Remove and
// Diagram Mapping in the panel by sending MENU_COMMAND. Remove keeps the
// panel's confirmation: removal deletes the model's studies and results
// permanently, and Lucid's undo cannot bring them back.
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { EnvelopeMessageType } from "@quodsi/lucid-shared";
import { MenuCommandHost } from "../MenuCommandHost";

const mocks = vi.hoisted(() => ({
  removeModel: vi.fn(),
  openDiagramMappingModal: vi.fn(),
}));

vi.mock("../../../messaging", () => ({
  useMessaging: () => ({ selection: { documentContext: { documentId: "doc-1" } } }),
}));
vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({ removeModel: mocks.removeModel }),
}));
vi.mock("../../../messaging/senders/simulationRunSender", () => ({
  useSimulationRunSender: () => ({ openDiagramMappingModal: mocks.openDiagramMappingModal }),
}));

const sendCommand = (command: string, type: string = EnvelopeMessageType.MENU_COMMAND) =>
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { id: "", type, source: "host", target: "model-iframe", version: "1.0", data: { command } },
      }),
    );
  });

beforeEach(() => {
  mocks.removeModel.mockClear();
  mocks.openDiagramMappingModal.mockClear();
});

describe("MenuCommandHost", () => {
  it("opens Diagram Mapping through the panel's sender", () => {
    render(<MenuCommandHost />);
    sendCommand("diagram-mapping");
    expect(mocks.openDiagramMappingModal).toHaveBeenCalledTimes(1);
  });

  it("asks before removing, then removes this document's model", () => {
    render(<MenuCommandHost />);
    sendCommand("remove-model");
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(mocks.removeModel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Remove Model" }));
    expect(mocks.removeModel).toHaveBeenCalledWith("doc-1");
    expect(screen.queryByText(/cannot be undone/i)).toBeNull();
  });

  it("cancelling the removal leaves the model alone", () => {
    render(<MenuCommandHost />);
    sendCommand("remove-model");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.removeModel).not.toHaveBeenCalled();
    expect(screen.queryByText(/cannot be undone/i)).toBeNull();
  });

  it("ignores other message types", () => {
    render(<MenuCommandHost />);
    sendCommand("remove-model", EnvelopeMessageType.TOUR_START);
    sendCommand("diagram-mapping", EnvelopeMessageType.TOUR_START);
    expect(screen.queryByText(/cannot be undone/i)).toBeNull();
    expect(mocks.openDiagramMappingModal).not.toHaveBeenCalled();
  });
});
