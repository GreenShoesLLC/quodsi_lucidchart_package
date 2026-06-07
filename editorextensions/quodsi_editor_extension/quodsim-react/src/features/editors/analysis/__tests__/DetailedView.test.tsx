// @quodsi/lucid-shared (pulled in by DetailedView.tsx) transitively loads
// shared/dist/services/lucidApi.js -> axios ESM, which CRA's Jest transformer
// can't parse. (Same pattern as ModelEditor.test.tsx / SummaryView.test.tsx.)
jest.mock("axios", () => ({}));

import { render, screen } from "@testing-library/react";
import DetailedView from "../DetailedView";

const baseProps = {
  data: [] as any[],
  loading: false,
  error: null,
  isComparing: false,
  getDataForType: () => new Map<string, any[]>(),
  comparisonLoading: false,
  dataType: "activity" as any,
  onDataTypeChange: () => {},
};

describe("DetailedView — stale takeover gating", () => {
  it("does NOT flash the 're-run required' takeover while metadata is still loading", () => {
    render(
      <DetailedView
        {...(baseProps as any)}
        scenarioMetaLoading={true}
        selectedScenarios={[
          { id: "a", name: "A", color: "#000", outputSchemaVersion: undefined } as any,
        ]}
      />
    );
    expect(screen.queryByText(/re-run required/i)).not.toBeInTheDocument();
  });

  it("DOES show the takeover once loaded and the version is genuinely incompatible", () => {
    render(
      <DetailedView
        {...(baseProps as any)}
        scenarioMetaLoading={false}
        selectedScenarios={[
          { id: "a", name: "A", color: "#000", outputSchemaVersion: null } as any,
        ]}
      />
    );
    expect(screen.getByText(/Re-run required/i)).toBeInTheDocument();
  });
});
