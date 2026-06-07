// @quodsi/lucid-shared (pulled in by SummaryView.tsx) transitively loads
// shared/dist/services/lucidApi.js, which requires axios's ESM entry that
// CRA's Jest transformer can't parse. We don't exercise lucidApi here.
// (Same pattern as ModelEditor.test.tsx.)
jest.mock("axios", () => ({}));

import { render, screen } from "@testing-library/react";
import SummaryView from "../SummaryView";

const baseProps = {
  summaryData: { scenario: undefined, activities: [], resources: [] } as any,
  summaryLoading: false,
  scenarioId: "scenario-1",
  onDrillDown: () => {},
};

describe("SummaryView — stale takeover gating", () => {
  it("does NOT show the 're-run required' takeover while scenario metadata is still loading", () => {
    // outputSchemaVersion is undefined here only because the run list hasn't
    // loaded yet — not because the run is genuinely legacy. The takeover must
    // not flash during this window.
    render(
      <SummaryView
        {...baseProps}
        scenarioMetaLoading={true}
        selectedScenarios={[
          { id: "scenario-1", name: "Baseline", color: "#000", outputSchemaVersion: undefined } as any,
        ]}
      />
    );
    expect(screen.queryByText(/Re-run required/i)).not.toBeInTheDocument();
  });

  it("DOES show the takeover once metadata is loaded and the version is genuinely incompatible", () => {
    render(
      <SummaryView
        {...baseProps}
        scenarioMetaLoading={false}
        selectedScenarios={[
          { id: "scenario-1", name: "Baseline", color: "#000", outputSchemaVersion: null } as any,
        ]}
      />
    );
    expect(screen.getByText(/Re-run required/i)).toBeInTheDocument();
  });

  it("shows the dashboard (no takeover) for a compatible version once loaded", () => {
    render(
      <SummaryView
        {...baseProps}
        scenarioMetaLoading={false}
        selectedScenarios={[
          { id: "scenario-1", name: "Baseline", color: "#000", outputSchemaVersion: "1.0" } as any,
        ]}
      />
    );
    expect(screen.queryByText(/Re-run required/i)).not.toBeInTheDocument();
    expect(screen.getByText(/System Performance/i)).toBeInTheDocument();
  });
});
