// @quodsi/shared transitively requires axios (ESM entry CRA's Jest can't parse).
// We don't exercise it here, so stub it. Must precede the ScenarioCard import.
jest.mock("axios", () => ({}));

// Isolate from entitlement logic — the Play button reads these selectors.
jest.mock("../../../messaging/state/entitlementsSlice", () => ({
  canSubmitSimulation: () => true,
  simulationsRemaining: () => null,
}));

const mockOpenAnimationModal = jest.fn();
jest.mock("../../../messaging/senders/simulationRunSender", () => ({
  useSimulationRunSender: () => ({ openAnimationModal: mockOpenAnimationModal }),
}));

jest.mock("../../../messaging/MessageContext", () => ({
  useEntitlements: () => ({ loaded: true }),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RunState, type ISerializedScenario } from "@quodsi/shared";
import { ScenarioCard } from "../ScenarioCard";

const scenario = { id: "scn-1", name: "Baseline", changeRequests: [] } as unknown as ISerializedScenario;

const baseProps = {
  scenario,
  expanded: false,
  onToggleExpand: jest.fn(),
  onPlay: jest.fn(),
  onUpdate: jest.fn(),
  onAnalyze: jest.fn(),
};

describe("ScenarioCard — View animation action", () => {
  beforeEach(() => {
    mockOpenAnimationModal.mockClear();
  });

  it("shows the action for a completed run and sends OPEN_ANIMATION_MODAL", () => {
    render(
      <ScenarioCard
        {...baseProps}
        runStatus={{ scenarioId: "scn-1", status: RunState.RanSuccessfully, hasResults: true }}
      />,
    );
    const btn = screen.getByTestId("view-animation");
    fireEvent.click(btn);
    expect(mockOpenAnimationModal).toHaveBeenCalledWith("scn-1");
  });

  it("is hidden when the scenario has no results", () => {
    render(
      <ScenarioCard
        {...baseProps}
        runStatus={{ scenarioId: "scn-1", status: RunState.NotRun, hasResults: false }}
      />,
    );
    expect(screen.queryByTestId("view-animation")).toBeNull();
  });

  it("is always enabled when results exist (no Open-in-Studio availability gate)", () => {
    render(
      <ScenarioCard
        {...baseProps}
        runStatus={{ scenarioId: "scn-1", status: RunState.RanSuccessfully, hasResults: true }}
      />,
    );
    const btn = screen.getByTestId("view-animation");
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(mockOpenAnimationModal).toHaveBeenCalledWith("scn-1");
  });
});

describe("ScenarioCard — cancel running run", () => {
  const runningStatus = { scenarioId: "scn-1", status: RunState.Running, hasResults: false };

  it("shows a Stop button while the run is active and calls onRequestCancel", () => {
    const onRequestCancel = jest.fn();
    render(
      <ScenarioCard {...baseProps} runStatus={runningStatus} onRequestCancel={onRequestCancel} />,
    );
    fireEvent.click(screen.getByTestId("cancel-run"));
    expect(onRequestCancel).toHaveBeenCalled();
  });

  it("renders the inline confirm and wires confirm/dismiss", () => {
    const onConfirmCancel = jest.fn();
    const onDismissCancel = jest.fn();
    render(
      <ScenarioCard
        {...baseProps}
        runStatus={runningStatus}
        isPendingCancel
        onConfirmCancel={onConfirmCancel}
        onDismissCancel={onDismissCancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Stop run" }));
    expect(onConfirmCancel).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep running" }));
    expect(onDismissCancel).toHaveBeenCalled();
  });

  it("shows a Cancelled label for a cancelled run", () => {
    render(
      <ScenarioCard
        {...baseProps}
        runStatus={{ scenarioId: "scn-1", status: RunState.Cancelled, hasResults: false }}
      />,
    );
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });
});
