import { mergeBarChartData } from "../scenarioDataMerge";

describe("mergeBarChartData", () => {
  const scenarios = [
    { id: "s1", name: "Baseline", color: "#3b82f6" },
    { id: "s2", name: "Scenario 2", color: "#f97316" },
  ];

  it("returns data unchanged for single scenario", () => {
    const dataMap = new Map([
      ["s1", [
        { activity_name: "A", utilization_mean: 0.8 },
        { activity_name: "B", utilization_mean: 0.6 },
      ]],
    ]);
    const result = mergeBarChartData(
      [scenarios[0]],
      dataMap,
      "activity_name",
      "utilization_mean"
    );
    expect(result.data).toEqual([
      { activity_name: "A", utilization_mean: 0.8 },
      { activity_name: "B", utilization_mean: 0.6 },
    ]);
    expect(result.yKeys).toEqual(["utilization_mean"]);
  });

  it("merges two scenarios into scenario-suffixed columns", () => {
    const dataMap = new Map([
      ["s1", [
        { activity_name: "A", utilization_mean: 0.8 },
        { activity_name: "B", utilization_mean: 0.6 },
      ]],
      ["s2", [
        { activity_name: "A", utilization_mean: 0.7 },
        { activity_name: "B", utilization_mean: 0.9 },
      ]],
    ]);
    const result = mergeBarChartData(scenarios, dataMap, "activity_name", "utilization_mean");
    expect(result.data).toEqual([
      { activity_name: "A", "utilization_mean_Baseline": 0.8, "utilization_mean_Scenario 2": 0.7 },
      { activity_name: "B", "utilization_mean_Baseline": 0.6, "utilization_mean_Scenario 2": 0.9 },
    ]);
    expect(result.yKeys).toEqual(["utilization_mean_Baseline", "utilization_mean_Scenario 2"]);
  });

  it("handles missing items in one scenario", () => {
    const dataMap = new Map([
      ["s1", [
        { activity_name: "A", utilization_mean: 0.8 },
        { activity_name: "B", utilization_mean: 0.6 },
      ]],
      ["s2", [
        { activity_name: "A", utilization_mean: 0.7 },
      ]],
    ]);
    const result = mergeBarChartData(scenarios, dataMap, "activity_name", "utilization_mean");
    expect(result.data[1]).toEqual({
      activity_name: "B",
      "utilization_mean_Baseline": 0.6,
      "utilization_mean_Scenario 2": null,
    });
  });

  it("handles empty data map", () => {
    const result = mergeBarChartData(scenarios, new Map(), "activity_name", "utilization_mean");
    expect(result.data).toEqual([]);
    expect(result.yKeys).toEqual(["utilization_mean_Baseline", "utilization_mean_Scenario 2"]);
  });
});
