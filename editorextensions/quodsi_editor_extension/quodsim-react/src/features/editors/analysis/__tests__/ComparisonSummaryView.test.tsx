// @quodsi/shared (pulled in by ComparisonSummaryView.tsx) transitively loads
// shared/dist/services/lucidApi.js -> axios ESM, which CRA's Jest transformer
// can't parse. (Same pattern as ModelEditor.test.tsx / SummaryView.test.tsx.)
jest.mock("axios", () => ({}));

import { render, screen } from "@testing-library/react";
import ComparisonSummaryView from "../ComparisonSummaryView";

const baseProps = {
  getDataForType: () => new Map<string, any[]>(),
  comparisonLoading: false,
  onDrillDown: () => {},
};

describe("ComparisonSummaryView — stale partition gating", () => {
  it("does NOT flash the stale banner while scenario metadata is still loading", () => {
    render(
      <ComparisonSummaryView
        {...(baseProps as any)}
        scenarioMetaLoading={true}
        selectedScenarios={[
          { id: "a", name: "A", color: "#000", outputSchemaVersion: undefined } as any,
          { id: "b", name: "B", color: "#111", outputSchemaVersion: undefined } as any,
        ]}
      />
    );
    expect(screen.queryByText(/re-run required/i)).not.toBeInTheDocument();
  });

  it("DOES show the stale banner once loaded and a scenario is genuinely incompatible", () => {
    render(
      <ComparisonSummaryView
        {...(baseProps as any)}
        scenarioMetaLoading={false}
        selectedScenarios={[
          { id: "a", name: "A", color: "#000", outputSchemaVersion: "1.0" } as any,
          { id: "b", name: "B", color: "#111", outputSchemaVersion: null } as any,
        ]}
      />
    );
    expect(screen.getByText(/hidden — re-run required/i)).toBeInTheDocument();
  });
});
