// @quodsi/shared transitively requires axios (ESM entry CRA's Jest can't parse).
// We don't exercise it here, so stub it. Must precede the ScenarioCard import.
jest.mock("axios", () => ({}));

// Isolate from entitlement logic — the Play button reads these selectors.
jest.mock("../../../messaging/state/entitlementsSlice", () => ({
  canSubmitSimulation: () => true,
  simulationsRemaining: () => null,
}));

const mockOpen = jest.fn();
let mockAvailable = true;
jest.mock("../../shared/useOpenInStudio", () => ({
  useOpenInStudio: () => ({ available: mockAvailable, open: mockOpen }),
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
    mockOpen.mockClear();
    mockAvailable = true;
  });

  it("shows the action for a completed run and opens the scenario animation", () => {
    render(
      <ScenarioCard
        {...baseProps}
        runStatus={{ scenarioId: "scn-1", status: RunState.RanSuccessfully, hasResults: true }}
      />,
    );
    const btn = screen.getByTestId("view-animation");
    fireEvent.click(btn);
    expect(mockOpen).toHaveBeenCalledWith("/animation/scn-1");
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

  it("is disabled when Open-in-Studio is unavailable", () => {
    mockAvailable = false;
    render(
      <ScenarioCard
        {...baseProps}
        runStatus={{ scenarioId: "scn-1", status: RunState.RanSuccessfully, hasResults: true }}
      />,
    );
    const btn = screen.getByTestId("view-animation");
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(mockOpen).not.toHaveBeenCalled();
  });
});
