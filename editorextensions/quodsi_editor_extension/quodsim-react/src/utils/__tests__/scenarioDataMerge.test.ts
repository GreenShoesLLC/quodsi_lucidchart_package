import { mergeBarChartData, mergeTimeseriesData, mergeTableColumns, mergeTableData } from "../scenarioDataMerge";

describe("mergeBarChartData", () => {
  const scenarios = [
    { id: "s1", name: "Baseline", color: "#3b82f6" },
    { id: "s2", name: "Scenario 2", color: "#f97316" },
  ];

  it("returns data unchanged for single scenario", () => {
    const dataMap = new Map([
      ["s1", [
        { activity_name: "A", capacity_utilization_mean: 0.8 },
        { activity_name: "B", capacity_utilization_mean: 0.6 },
      ]],
    ]);
    const result = mergeBarChartData(
      [scenarios[0]],
      dataMap,
      "activity_name",
      "capacity_utilization_mean"
    );
    expect(result.data).toEqual([
      { activity_name: "A", capacity_utilization_mean: 0.8 },
      { activity_name: "B", capacity_utilization_mean: 0.6 },
    ]);
    expect(result.yKeys).toEqual(["capacity_utilization_mean"]);
  });

  it("merges two scenarios into scenario-suffixed columns", () => {
    const dataMap = new Map([
      ["s1", [
        { activity_name: "A", capacity_utilization_mean: 0.8 },
        { activity_name: "B", capacity_utilization_mean: 0.6 },
      ]],
      ["s2", [
        { activity_name: "A", capacity_utilization_mean: 0.7 },
        { activity_name: "B", capacity_utilization_mean: 0.9 },
      ]],
    ]);
    const result = mergeBarChartData(scenarios, dataMap, "activity_name", "capacity_utilization_mean");
    expect(result.data).toEqual([
      { activity_name: "A", "capacity_utilization_mean_Baseline": 0.8, "capacity_utilization_mean_Scenario 2": 0.7 },
      { activity_name: "B", "capacity_utilization_mean_Baseline": 0.6, "capacity_utilization_mean_Scenario 2": 0.9 },
    ]);
    expect(result.yKeys).toEqual(["capacity_utilization_mean_Baseline", "capacity_utilization_mean_Scenario 2"]);
  });

  it("handles missing items in one scenario", () => {
    const dataMap = new Map([
      ["s1", [
        { activity_name: "A", capacity_utilization_mean: 0.8 },
        { activity_name: "B", capacity_utilization_mean: 0.6 },
      ]],
      ["s2", [
        { activity_name: "A", capacity_utilization_mean: 0.7 },
      ]],
    ]);
    const result = mergeBarChartData(scenarios, dataMap, "activity_name", "capacity_utilization_mean");
    expect(result.data[1]).toEqual({
      activity_name: "B",
      "capacity_utilization_mean_Baseline": 0.6,
      "capacity_utilization_mean_Scenario 2": null,
    });
  });

  it("handles empty data map", () => {
    const result = mergeBarChartData(scenarios, new Map(), "activity_name", "capacity_utilization_mean");
    expect(result.data).toEqual([]);
    expect(result.yKeys).toEqual(["capacity_utilization_mean_Baseline", "capacity_utilization_mean_Scenario 2"]);
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

describe("mergeTableColumns", () => {
  const scenarios = [
    { id: "s1", name: "Baseline", color: "#3b82f6" },
    { id: "s2", name: "Scenario 2", color: "#f97316" },
  ];

  const columns = [
    { key: "activity_name", label: "Activity" },
    { key: "capacity_utilization_mean", label: "Utilization" },
    { key: "cycle_time_mean", label: "Cycle Time" },
  ];

  it("returns columns unchanged for single scenario", () => {
    const result = mergeTableColumns([scenarios[0]], columns, "activity_name");
    expect(result).toEqual(columns);
  });

  it("creates scenario-suffixed columns for 2 scenarios", () => {
    const result = mergeTableColumns(scenarios, columns, "activity_name");
    expect(result[0]).toEqual({ key: "activity_name", label: "Activity" });
    expect(result[1].key).toBe("capacity_utilization_mean_Baseline");
    expect(result[1].label).toBe("Utilization (Baseline)");
    expect(result[2].key).toBe("capacity_utilization_mean_Scenario 2");
    expect(result[2].label).toBe("Utilization (Scenario 2)");
    expect(result[3].key).toBe("cycle_time_mean_Baseline");
    expect(result[4].key).toBe("cycle_time_mean_Scenario 2");
    expect(result).toHaveLength(5); // 1 name + 2 metrics * 2 scenarios
  });
});

describe("mergeTableData", () => {
  const scenarios = [
    { id: "s1", name: "Baseline", color: "#3b82f6" },
    { id: "s2", name: "Scenario 2", color: "#f97316" },
  ];

  it("returns data unchanged for single scenario", () => {
    const dataMap = new Map([
      ["s1", [{ activity_name: "A", capacity_utilization_mean: 0.8 }]],
    ]);
    const result = mergeTableData([scenarios[0]], dataMap, "activity_name");
    expect(result).toEqual(dataMap.get("s1"));
  });

  it("merges two scenarios into scenario-suffixed fields", () => {
    const dataMap = new Map([
      ["s1", [
        { activity_name: "A", capacity_utilization_mean: 0.8, cycle_time_mean: 5.0 },
      ]],
      ["s2", [
        { activity_name: "A", capacity_utilization_mean: 0.7, cycle_time_mean: 4.0 },
      ]],
    ]);
    const result = mergeTableData(scenarios, dataMap, "activity_name");
    expect(result).toEqual([{
      activity_name: "A",
      "capacity_utilization_mean_Baseline": 0.8,
      "cycle_time_mean_Baseline": 5.0,
      "capacity_utilization_mean_Scenario 2": 0.7,
      "cycle_time_mean_Scenario 2": 4.0,
    }]);
  });

  it("handles items missing in one scenario", () => {
    const dataMap = new Map([
      ["s1", [
        { activity_name: "A", capacity_utilization_mean: 0.8 },
        { activity_name: "B", capacity_utilization_mean: 0.6 },
      ]],
      ["s2", [
        { activity_name: "A", capacity_utilization_mean: 0.7 },
      ]],
    ]);
    const result = mergeTableData(scenarios, dataMap, "activity_name");
    const rowB = result.find((r) => r.activity_name === "B")!;
    expect(rowB["capacity_utilization_mean_Baseline"]).toBe(0.6);
    expect(rowB["capacity_utilization_mean_Scenario 2"]).toBeUndefined();
  });
});
