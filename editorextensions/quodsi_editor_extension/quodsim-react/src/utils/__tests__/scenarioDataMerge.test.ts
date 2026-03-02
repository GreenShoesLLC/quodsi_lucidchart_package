import { mergeBarChartData, mergeTimeseriesData } from "../scenarioDataMerge";

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

describe("mergeTimeseriesData", () => {
  const scenarios = [
    { id: "s1", name: "Baseline", color: "#3b82f6" },
    { id: "s2", name: "Scenario 2", color: "#f97316" },
  ];

  it("returns data unchanged for single scenario", () => {
    const dataMap = new Map([
      ["s1", [
        { object_id: "A", period_start_clock: 0, mean: 5.0 },
        { object_id: "A", period_start_clock: 10, mean: 6.0 },
      ]],
    ]);
    const result = mergeTimeseriesData(
      [scenarios[0]],
      dataMap,
      "object_id",
      "period_start_clock",
      "mean"
    );
    expect(result.data).toEqual(dataMap.get("s1"));
    expect(result.yKeys).toEqual(["mean"]);
  });

  it("merges two scenarios by time axis per object", () => {
    const dataMap = new Map([
      ["s1", [
        { object_id: "A", period_start_clock: 0, mean: 5.0 },
        { object_id: "A", period_start_clock: 10, mean: 6.0 },
      ]],
      ["s2", [
        { object_id: "A", period_start_clock: 0, mean: 4.0 },
        { object_id: "A", period_start_clock: 10, mean: 7.0 },
      ]],
    ]);
    const result = mergeTimeseriesData(scenarios, dataMap, "object_id", "period_start_clock", "mean");
    expect(result.data).toEqual([
      { object_id: "A", period_start_clock: 0, "mean_Baseline": 5.0, "mean_Scenario 2": 4.0 },
      { object_id: "A", period_start_clock: 10, "mean_Baseline": 6.0, "mean_Scenario 2": 7.0 },
    ]);
    expect(result.yKeys).toEqual(["mean_Baseline", "mean_Scenario 2"]);
  });

  it("handles multiple objects", () => {
    const dataMap = new Map([
      ["s1", [
        { object_id: "A", period_start_clock: 0, mean: 5.0 },
        { object_id: "B", period_start_clock: 0, mean: 3.0 },
      ]],
      ["s2", [
        { object_id: "A", period_start_clock: 0, mean: 4.0 },
        { object_id: "B", period_start_clock: 0, mean: 2.0 },
      ]],
    ]);
    const result = mergeTimeseriesData(scenarios, dataMap, "object_id", "period_start_clock", "mean");
    const objectARows = result.data.filter((r) => r.object_id === "A");
    const objectBRows = result.data.filter((r) => r.object_id === "B");
    expect(objectARows[0]["mean_Baseline"]).toBe(5.0);
    expect(objectARows[0]["mean_Scenario 2"]).toBe(4.0);
    expect(objectBRows[0]["mean_Baseline"]).toBe(3.0);
    expect(objectBRows[0]["mean_Scenario 2"]).toBe(2.0);
  });

  it("handles mismatched time points with null fill", () => {
    const dataMap = new Map([
      ["s1", [
        { object_id: "A", period_start_clock: 0, mean: 5.0 },
        { object_id: "A", period_start_clock: 10, mean: 6.0 },
      ]],
      ["s2", [
        { object_id: "A", period_start_clock: 0, mean: 4.0 },
      ]],
    ]);
    const result = mergeTimeseriesData(scenarios, dataMap, "object_id", "period_start_clock", "mean");
    expect(result.data[1]["mean_Scenario 2"]).toBeNull();
  });
});
