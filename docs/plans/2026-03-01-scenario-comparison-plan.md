# Scenario Comparison Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Evolve SimulationRunAnalysisDashboard to support comparing 1-5 scenarios side by side with overlaid charts and merged tables.

**Architecture:** Client-side merge approach. The existing single-scenario data pipeline (`getCrossRepData`) is called once per selected scenario. A new `useComparisonData` hook manages multi-scenario state, caching, and parallel fetching. Data merge utilities transform per-scenario arrays into chart/table-ready formats. The ScenarioPicker component allows users to add/remove scenarios. All 11 data types are supported.

**Tech Stack:** React 18, TypeScript, Recharts, Tailwind CSS, lucid-extension-sdk

**Design Doc:** `docs/plans/2026-03-01-scenario-comparison-design.md`

---

## Task 1: Add `scenarioId` to Shared Types

The `CrossRepDataResultMessage` type does not include `scenarioId` in its response data. Without this, the dashboard cannot correlate responses when multiple scenario fetches are in flight.

**Files:**
- Modify: `shared/src/quodsi-messaging/simulationRun/simulationRunMessages.ts` (lines 89-98)

**Step 1: Update the type definition**

In `simulationRunMessages.ts`, add `scenarioId` to the `CrossRepDataResultMessage.data` type:

```typescript
export interface CrossRepDataResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.CROSS_REP_DATA_RESULT;
  data: {
    success: boolean;
    data: any[];
    recordCount: number;
    dataType: 'activity' | 'entity' | 'resource' | 'activity-entity' | 'activity-contents-timeseries' | 'state-summary' | 'activity-inbound-queue-timeseries' | 'activity-outbound-queue-timeseries' | 'entity-throughput-timeseries';
    scenarioId: string;
    error?: string;
  };
}
```

**Step 2: Build the shared library**

Run: `npm run build -w @quodsi/shared`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add shared/src/quodsi-messaging/simulationRun/simulationRunMessages.ts
git commit -m "feat: add scenarioId to CrossRepDataResultMessage type"
```

---

## Task 2: Echo `scenarioId` in Extension Handler

The handler already has `scenarioId` from the request — it just needs to include it in the response.

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/src/core/messaging/handlers/simulationRunHandler.ts` (lines 306-318)

**Step 1: Add `scenarioId` to the response**

In `handleCrossRepDataRequest`, find the response block (around line 306-318):

```typescript
router.send(responseChannel, {
  id: msg.id,
  type: EnvelopeMessageType.CROSS_REP_DATA_RESULT,
  source: 'host',
  target: `${responseChannel}-iframe`,
  version: '1.0',
  data: {
    ...responseData,
    dataType: data.dataType,
    scenarioId: data.scenarioId  // ADD THIS LINE
  }
});
```

Also add `scenarioId` to the error response block in the same method (where it sends an error `CROSS_REP_DATA_RESULT`):

```typescript
data: {
  success: false,
  data: [],
  recordCount: 0,
  dataType: data.dataType,
  scenarioId: data.scenarioId,  // ADD THIS LINE
  error: errorMessage
}
```

**Step 2: Verify the extension builds**

Run: `cd editorextensions/quodsi_editor_extension && npx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```bash
git add editorextensions/quodsi_editor_extension/src/core/messaging/handlers/simulationRunHandler.ts
git commit -m "feat: echo scenarioId in CROSS_REP_DATA_RESULT response"
```

---

## Task 3: Extract Shared Chart Color Palette

The same 8-color palette is duplicated in `TimeseriesChart.tsx` and `ComparisonBarChart.tsx`. Extract it to a shared constant so the comparison feature can assign consistent colors.

**Files:**
- Create: `editorextensions/quodsi_editor_extension/quodsim-react/src/components/charts/chartColors.ts`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/components/charts/TimeseriesChart.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/components/charts/ComparisonBarChart.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/components/charts/index.ts`

**Step 1: Create the shared palette file**

`chartColors.ts`:
```typescript
/** Shared color palette for all chart components. Max 8 series. */
export const CHART_COLORS = [
  "#3b82f6", // blue
  "#f97316", // orange
  "#10b981", // green
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f59e0b", // amber
];

/**
 * Scenario comparison colors — first 5 from the palette.
 * Each scenario gets a fixed color by selection order.
 */
export const SCENARIO_COLORS = CHART_COLORS.slice(0, 5);
```

Note: the order is deliberately changed from the original to put orange second (better visual contrast for 2-scenario comparisons, the most common case).

**Step 2: Update chart components to import from shared palette**

In `TimeseriesChart.tsx`, replace the local `DEFAULT_COLORS` array with:
```typescript
import { CHART_COLORS } from "./chartColors";
```
And replace all references from `DEFAULT_COLORS` to `CHART_COLORS`.

Do the same in `ComparisonBarChart.tsx`.

**Step 3: Re-export from index**

In `charts/index.ts`, add:
```typescript
export { CHART_COLORS, SCENARIO_COLORS } from "./chartColors";
```

**Step 4: Verify React app builds**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: No type errors.

**Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/components/charts/
git commit -m "refactor: extract shared chart color palette"
```

---

## Task 4: Create Bar Chart Data Merge Utility (TDD)

Pure function that pivots per-scenario data arrays into a single array suitable for `ComparisonBarChart`. When only 1 scenario is selected, it returns the data unchanged.

**Files:**
- Create: `editorextensions/quodsi_editor_extension/quodsim-react/src/utils/scenarioDataMerge.ts`
- Create: `editorextensions/quodsi_editor_extension/quodsim-react/src/utils/__tests__/scenarioDataMerge.test.ts`

**Step 1: Write failing tests for `mergeBarChartData`**

```typescript
// scenarioDataMerge.test.ts
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
        // B missing in scenario 2
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
```

**Step 2: Run tests to verify they fail**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx jest --testPathPattern="scenarioDataMerge" --no-coverage`
Expected: FAIL — module not found.

**Step 3: Implement `mergeBarChartData`**

```typescript
// scenarioDataMerge.ts

export interface SelectedScenario {
  id: string;
  name: string;
  color: string;
}

interface MergedBarData {
  data: Record<string, any>[];
  yKeys: string[];
  colors: string[];
}

/**
 * Pivots per-scenario bar chart data into merged rows with scenario-suffixed columns.
 * For a single scenario, returns data unchanged (no suffix).
 */
export function mergeBarChartData(
  scenarios: SelectedScenario[],
  dataMap: Map<string, any[]>,
  nameKey: string,
  metricKey: string
): MergedBarData {
  // Single scenario: pass through unchanged
  if (scenarios.length === 1) {
    const data = dataMap.get(scenarios[0].id) || [];
    return { data, yKeys: [metricKey], colors: [scenarios[0].color] };
  }

  // Collect all unique names across all scenarios
  const allNames = new Set<string>();
  for (const [, rows] of dataMap) {
    for (const row of rows) {
      if (row[nameKey]) allNames.add(row[nameKey]);
    }
  }

  // Build yKeys and colors
  const yKeys = scenarios.map((s) => `${metricKey}_${s.name}`);
  const colors = scenarios.map((s) => s.color);

  // Build merged rows
  const data = Array.from(allNames)
    .sort()
    .map((name) => {
      const row: Record<string, any> = { [nameKey]: name };
      for (const scenario of scenarios) {
        const scenarioData = dataMap.get(scenario.id) || [];
        const match = scenarioData.find((r: any) => r[nameKey] === name);
        row[`${metricKey}_${scenario.name}`] = match ? match[metricKey] : null;
      }
      return row;
    });

  return { data, yKeys, colors };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx jest --testPathPattern="scenarioDataMerge" --no-coverage`
Expected: All 4 tests PASS.

**Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/utils/scenarioDataMerge.ts
git add editorextensions/quodsi_editor_extension/quodsim-react/src/utils/__tests__/scenarioDataMerge.test.ts
git commit -m "feat: add mergeBarChartData utility with tests"
```

---

## Task 5: Create Timeseries Data Merge Utility (TDD)

Merges per-scenario timeseries data into a single array with scenario-suffixed y-keys, joined on the time axis. Used for both TimeseriesChart and SparklineGrid overlays.

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/utils/scenarioDataMerge.ts`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/utils/__tests__/scenarioDataMerge.test.ts`

**Step 1: Write failing tests for `mergeTimeseriesData`**

Add to the existing test file:

```typescript
import { mergeBarChartData, mergeTimeseriesData } from "../scenarioDataMerge";

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
    const objectARows = result.data.filter((r: any) => r.object_id === "A");
    const objectBRows = result.data.filter((r: any) => r.object_id === "B");
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
        // time point 10 missing in scenario 2
      ]],
    ]);
    const result = mergeTimeseriesData(scenarios, dataMap, "object_id", "period_start_clock", "mean");
    expect(result.data[1]["mean_Scenario 2"]).toBeNull();
  });
});
```

**Step 2: Run tests to verify new tests fail**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx jest --testPathPattern="scenarioDataMerge" --no-coverage`
Expected: New tests FAIL, existing tests still PASS.

**Step 3: Implement `mergeTimeseriesData`**

Add to `scenarioDataMerge.ts`:

```typescript
interface MergedTimeseriesData {
  data: Record<string, any>[];
  yKeys: string[];
  colors: string[];
}

/**
 * Merges per-scenario timeseries data by joining on (groupKey, xKey).
 * Produces scenario-suffixed y-keys for overlaid chart rendering.
 * For a single scenario, returns data unchanged.
 */
export function mergeTimeseriesData(
  scenarios: SelectedScenario[],
  dataMap: Map<string, any[]>,
  groupKey: string,
  xKey: string,
  yKey: string
): MergedTimeseriesData {
  if (scenarios.length === 1) {
    const data = dataMap.get(scenarios[0].id) || [];
    return { data, yKeys: [yKey], colors: [scenarios[0].color] };
  }

  const yKeys = scenarios.map((s) => `${yKey}_${s.name}`);
  const colors = scenarios.map((s) => s.color);

  // Build a lookup: (objectId, timeValue) -> merged row
  const mergedMap = new Map<string, Record<string, any>>();

  for (const scenario of scenarios) {
    const rows = dataMap.get(scenario.id) || [];
    for (const row of rows) {
      const key = `${row[groupKey]}__${row[xKey]}`;
      if (!mergedMap.has(key)) {
        const newRow: Record<string, any> = {
          [groupKey]: row[groupKey],
          [xKey]: row[xKey],
        };
        // Initialize all scenario columns as null
        for (const s of scenarios) {
          newRow[`${yKey}_${s.name}`] = null;
        }
        mergedMap.set(key, newRow);
      }
      mergedMap.get(key)![`${yKey}_${scenario.name}`] = row[yKey];
    }
  }

  // Sort by groupKey then xKey
  const data = Array.from(mergedMap.values()).sort((a, b) => {
    const groupCmp = String(a[groupKey]).localeCompare(String(b[groupKey]));
    if (groupCmp !== 0) return groupCmp;
    return (a[xKey] as number) - (b[xKey] as number);
  });

  return { data, yKeys, colors };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx jest --testPathPattern="scenarioDataMerge" --no-coverage`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/utils/scenarioDataMerge.ts
git add editorextensions/quodsi_editor_extension/quodsim-react/src/utils/__tests__/scenarioDataMerge.test.ts
git commit -m "feat: add mergeTimeseriesData utility with tests"
```

---

## Task 6: Create Table Column Merge Utility (TDD)

Creates merged `TableColumn[]` definitions for multi-scenario table views. The name/identifier column stays as-is; each metric column is duplicated per scenario with scenario-suffixed keys and labels.

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/utils/scenarioDataMerge.ts`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/utils/__tests__/scenarioDataMerge.test.ts`

**Step 1: Write failing tests for `mergeTableColumns` and `mergeTableData`**

Add to the test file:

```typescript
import {
  mergeBarChartData,
  mergeTimeseriesData,
  mergeTableColumns,
  mergeTableData,
} from "../scenarioDataMerge";
import { TableColumn } from "../../../components/DataTable";

describe("mergeTableColumns", () => {
  const scenarios = [
    { id: "s1", name: "Baseline", color: "#3b82f6" },
    { id: "s2", name: "Scenario 2", color: "#f97316" },
  ];

  const columns: TableColumn[] = [
    { key: "activity_name", label: "Activity" },
    { key: "utilization_mean", label: "Utilization" },
    { key: "cycle_time_mean", label: "Cycle Time" },
  ];

  it("returns columns unchanged for single scenario", () => {
    const result = mergeTableColumns([scenarios[0]], columns, "activity_name");
    expect(result).toEqual(columns);
  });

  it("creates scenario-suffixed columns for 2 scenarios", () => {
    const result = mergeTableColumns(scenarios, columns, "activity_name");
    expect(result[0]).toEqual({ key: "activity_name", label: "Activity" });
    expect(result[1].key).toBe("utilization_mean_Baseline");
    expect(result[1].label).toBe("Utilization (Baseline)");
    expect(result[2].key).toBe("utilization_mean_Scenario 2");
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
      ["s1", [{ activity_name: "A", utilization_mean: 0.8 }]],
    ]);
    const result = mergeTableData([scenarios[0]], dataMap, "activity_name");
    expect(result).toEqual(dataMap.get("s1"));
  });

  it("merges two scenarios into scenario-suffixed fields", () => {
    const dataMap = new Map([
      ["s1", [
        { activity_name: "A", utilization_mean: 0.8, cycle_time_mean: 5.0 },
      ]],
      ["s2", [
        { activity_name: "A", utilization_mean: 0.7, cycle_time_mean: 4.0 },
      ]],
    ]);
    const result = mergeTableData(scenarios, dataMap, "activity_name");
    expect(result).toEqual([{
      activity_name: "A",
      "utilization_mean_Baseline": 0.8,
      "cycle_time_mean_Baseline": 5.0,
      "utilization_mean_Scenario 2": 0.7,
      "cycle_time_mean_Scenario 2": 4.0,
    }]);
  });

  it("handles items missing in one scenario", () => {
    const dataMap = new Map([
      ["s1", [
        { activity_name: "A", utilization_mean: 0.8 },
        { activity_name: "B", utilization_mean: 0.6 },
      ]],
      ["s2", [
        { activity_name: "A", utilization_mean: 0.7 },
      ]],
    ]);
    const result = mergeTableData(scenarios, dataMap, "activity_name");
    const rowB = result.find((r: any) => r.activity_name === "B");
    expect(rowB["utilization_mean_Baseline"]).toBe(0.6);
    expect(rowB["utilization_mean_Scenario 2"]).toBeUndefined();
  });
});
```

**Step 2: Run tests to verify new tests fail**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx jest --testPathPattern="scenarioDataMerge" --no-coverage`
Expected: New tests FAIL.

**Step 3: Implement `mergeTableColumns` and `mergeTableData`**

Add to `scenarioDataMerge.ts`:

```typescript
import { TableColumn } from "../../components/DataTable";

/**
 * Creates merged column definitions for multi-scenario tables.
 * The name column stays unchanged; metric columns are duplicated per scenario.
 * For a single scenario, returns columns unchanged.
 */
export function mergeTableColumns(
  scenarios: SelectedScenario[],
  columns: TableColumn[],
  nameKey: string
): TableColumn[] {
  if (scenarios.length === 1) return columns;

  const result: TableColumn[] = [];

  for (const col of columns) {
    if (col.key === nameKey) {
      result.push(col);
    } else {
      // Duplicate this column for each scenario
      for (const scenario of scenarios) {
        result.push({
          key: `${col.key}_${scenario.name}`,
          label: `${col.label} (${scenario.name})`,
          format: col.format,
        });
      }
    }
  }

  return result;
}

/**
 * Merges per-scenario data arrays into rows with scenario-suffixed fields.
 * Joins on nameKey. For a single scenario, returns data unchanged.
 */
export function mergeTableData(
  scenarios: SelectedScenario[],
  dataMap: Map<string, any[]>,
  nameKey: string
): Record<string, any>[] {
  if (scenarios.length === 1) {
    return dataMap.get(scenarios[0].id) || [];
  }

  // Collect all unique names
  const rowMap = new Map<string, Record<string, any>>();

  for (const scenario of scenarios) {
    const rows = dataMap.get(scenario.id) || [];
    for (const row of rows) {
      const name = row[nameKey];
      if (!name) continue;

      if (!rowMap.has(name)) {
        rowMap.set(name, { [nameKey]: name });
      }

      const mergedRow = rowMap.get(name)!;
      // Copy all non-name fields with scenario suffix
      for (const [key, value] of Object.entries(row)) {
        if (key !== nameKey) {
          mergedRow[`${key}_${scenario.name}`] = value;
        }
      }
    }
  }

  return Array.from(rowMap.values()).sort((a, b) =>
    String(a[nameKey]).localeCompare(String(b[nameKey]))
  );
}
```

Note: the import path for `TableColumn` uses `../../components/DataTable` — adjust the relative path based on the actual file location (`src/utils/scenarioDataMerge.ts` → `src/components/DataTable.tsx`).

**Step 4: Run tests to verify they pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx jest --testPathPattern="scenarioDataMerge" --no-coverage`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/utils/scenarioDataMerge.ts
git add editorextensions/quodsi_editor_extension/quodsim-react/src/utils/__tests__/scenarioDataMerge.test.ts
git commit -m "feat: add mergeTableColumns and mergeTableData utilities with tests"
```

---

## Task 7: Create ScenarioPicker Component

A horizontal chip bar that shows selected scenarios with color indicators and an "Add" dropdown to select additional scenarios.

**Files:**
- Create: `editorextensions/quodsi_editor_extension/quodsim-react/src/components/ScenarioPicker.tsx`

**Step 1: Implement the component**

```typescript
// ScenarioPicker.tsx
import React, { useState, useRef, useEffect } from "react";
import { X, Plus, ChevronDown } from "lucide-react";
import { SelectedScenario } from "../utils/scenarioDataMerge";

interface AvailableScenario {
  id: string;
  name: string;
}

interface ScenarioPickerProps {
  selectedScenarios: SelectedScenario[];
  availableScenarios: AvailableScenario[];
  onAdd: (scenarioId: string) => void;
  onRemove: (scenarioId: string) => void;
  maxScenarios?: number;
}

const ScenarioPicker: React.FC<ScenarioPickerProps> = ({
  selectedScenarios,
  availableScenarios,
  onAdd,
  onRemove,
  maxScenarios = 5,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedIds = new Set(selectedScenarios.map((s) => s.id));
  const unselected = availableScenarios.filter((s) => !selectedIds.has(s.id));
  const atMax = selectedScenarios.length >= maxScenarios;
  const canRemove = selectedScenarios.length > 1;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Selected scenario chips */}
      {selectedScenarios.map((scenario) => (
        <div
          key={scenario.id}
          className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs"
          title={scenario.id}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: scenario.color }}
          />
          <span className="truncate max-w-[100px]">{scenario.name}</span>
          {canRemove && (
            <button
              onClick={() => onRemove(scenario.id)}
              className="text-gray-400 hover:text-gray-600 ml-0.5"
              title="Remove from comparison"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      {/* Add scenario dropdown */}
      {unselected.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => !atMax && setDropdownOpen(!dropdownOpen)}
            disabled={atMax}
            className={`flex items-center gap-0.5 px-2 py-0.5 text-xs rounded border transition-colors ${
              atMax
                ? "border-gray-200 text-gray-300 cursor-not-allowed"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
            title={atMax ? `Maximum ${maxScenarios} scenarios` : "Add scenario to compare"}
          >
            <Plus className="w-3 h-3" />
            Add
            <ChevronDown className="w-3 h-3" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 min-w-[160px] max-h-[200px] overflow-y-auto">
              {unselected.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => {
                    onAdd(scenario.id);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 transition-colors"
                  title={scenario.id}
                >
                  {scenario.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScenarioPicker;
```

**Step 2: Verify it compiles**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/components/ScenarioPicker.tsx
git commit -m "feat: add ScenarioPicker component for scenario comparison"
```

---

## Task 8: Extend SparklineGrid for Multi-Series

The SparklineGrid currently renders a single `yKey` per sparkline. For comparison mode, it needs to render multiple overlaid lines per cell (one per scenario).

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/components/charts/SparklineGrid.tsx`

**Step 1: Add `yKeys` prop alongside existing `yKey`**

Update the props interface to accept either `yKey` (single series, backwards compatible) or `yKeys` (multi-series):

```typescript
interface SparklineGridProps {
  data: any[];
  groupByKey: string;
  xKey: string;
  yKey?: string;           // single series (existing)
  yKeys?: string[];        // multi-series for comparison
  colors?: string[];       // colors for multi-series
  onItemClick?: (objectId: string) => void;
  sparklineHeight?: number;
  maxItems?: number;
}
```

**Step 2: Update rendering logic**

Derive the effective keys list:
```typescript
const effectiveYKeys = props.yKeys || (props.yKey ? [props.yKey] : ["value"]);
const effectiveColors = props.colors || CHART_COLORS;
```

Replace the single `<Line>` in each sparkline with a map over `effectiveYKeys`:
```typescript
{effectiveYKeys.map((key, idx) => (
  <Line
    key={key}
    type="monotone"
    dataKey={key}
    stroke={effectiveColors[idx % effectiveColors.length]}
    strokeWidth={1.5}
    dot={false}
    isAnimationActive={false}
  />
))}
```

**Step 3: Verify it compiles and existing behavior is unchanged**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: No type errors. The `yKey` prop still works for the existing single-scenario dashboard usage.

**Step 4: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/components/charts/SparklineGrid.tsx
git commit -m "feat: extend SparklineGrid to support multi-series overlays"
```

---

## Task 9: Create `useComparisonData` Hook

Custom hook that manages multi-scenario selection, data fetching, caching, and loading states. This extracts complexity from the dashboard component.

**Files:**
- Create: `editorextensions/quodsi_editor_extension/quodsim-react/src/hooks/useComparisonData.ts`

**Step 1: Implement the hook**

```typescript
// useComparisonData.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { EnvelopeMessageType, SimulationRunInfo } from "@quodsi/shared";
import { useSimulationRunSender } from "../messaging/senders/simulationRunSender";
import { SelectedScenario } from "../utils/scenarioDataMerge";
import { SCENARIO_COLORS } from "../components/charts";

interface AvailableScenario {
  id: string;
  name: string;
}

interface UseComparisonDataReturn {
  // Scenario selection
  selectedScenarios: SelectedScenario[];
  availableScenarios: AvailableScenario[];
  addScenario: (scenarioId: string) => void;
  removeScenario: (scenarioId: string) => void;

  // Data access
  getDataForType: (dataType: string) => Map<string, any[]>;
  isLoading: boolean;
  fetchDataType: (dataType: string) => void;

  // Available scenarios loading
  availableScenariosLoading: boolean;
}

export function useComparisonData(
  documentId: string,
  initialScenarioId: string,
  initialScenarioName?: string
): UseComparisonDataReturn {
  const { getCrossRepData, listSimulationRuns } = useSimulationRunSender();

  // Scenario selection state
  const [selectedScenarios, setSelectedScenarios] = useState<SelectedScenario[]>([
    {
      id: initialScenarioId,
      name: initialScenarioName || initialScenarioId,
      color: SCENARIO_COLORS[0],
    },
  ]);
  const [availableScenarios, setAvailableScenarios] = useState<AvailableScenario[]>([]);
  const [availableScenariosLoading, setAvailableScenariosLoading] = useState(true);

  // Data cache: scenarioId -> dataType -> data[]
  const cacheRef = useRef(new Map<string, Map<string, any[]>>());

  // Track which (scenarioId, dataType) pairs are currently being fetched
  const pendingRef = useRef(new Set<string>());

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Color assignment counter
  const nextColorRef = useRef(1); // 0 is already used by initial scenario

  // Fetch available scenarios on mount
  useEffect(() => {
    if (documentId) {
      listSimulationRuns(documentId);
    }
  }, [documentId, listSimulationRuns]);

  // Listen for available scenarios and cross-rep data responses
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      // Handle simulation runs list (for available scenarios)
      if (message.type === EnvelopeMessageType.SIMULATION_RUNS_LIST_RESULT) {
        const runs: SimulationRunInfo[] = message.data?.scenarios || message.data?.simulationRuns || [];
        const withResults = runs
          .filter((r) => r.hasResults)
          .map((r) => ({ id: r.id, name: r.name }));
        setAvailableScenarios(withResults);
        setAvailableScenariosLoading(false);

        // Update initial scenario name if it was set to the ID
        const initialRun = runs.find((r) => r.id === initialScenarioId);
        if (initialRun) {
          setSelectedScenarios((prev) =>
            prev.map((s) =>
              s.id === initialScenarioId && s.name === initialScenarioId
                ? { ...s, name: initialRun.name }
                : s
            )
          );
        }
      }

      // Handle cross-rep data responses
      if (message.type === EnvelopeMessageType.CROSS_REP_DATA_RESULT) {
        const { dataType, scenarioId, success, data } = message.data;
        if (!scenarioId) return; // Old-style response without scenarioId — ignore in comparison context

        const pendingKey = `${scenarioId}__${dataType}`;
        pendingRef.current.delete(pendingKey);

        if (success) {
          // Update cache
          if (!cacheRef.current.has(scenarioId)) {
            cacheRef.current.set(scenarioId, new Map());
          }
          cacheRef.current.get(scenarioId)!.set(dataType, data || []);
        }

        // Check if all pending requests are done
        if (pendingRef.current.size === 0) {
          setIsLoading(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [initialScenarioId]);

  // Add a scenario
  const addScenario = useCallback(
    (scenarioId: string) => {
      const available = availableScenarios.find((s) => s.id === scenarioId);
      if (!available) return;

      const colorIndex = nextColorRef.current % SCENARIO_COLORS.length;
      nextColorRef.current++;

      setSelectedScenarios((prev) => [
        ...prev,
        { id: scenarioId, name: available.name, color: SCENARIO_COLORS[colorIndex] },
      ]);
    },
    [availableScenarios]
  );

  // Remove a scenario
  const removeScenario = useCallback((scenarioId: string) => {
    setSelectedScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
  }, []);

  // Fetch data for a specific data type across all selected scenarios
  const fetchDataType = useCallback(
    (dataType: string) => {
      let anyFetched = false;

      for (const scenario of selectedScenarios) {
        // Skip if already cached
        if (cacheRef.current.get(scenario.id)?.has(dataType)) continue;

        const pendingKey = `${scenario.id}__${dataType}`;
        if (pendingRef.current.has(pendingKey)) continue;

        pendingRef.current.add(pendingKey);
        getCrossRepData(documentId, scenario.id, dataType as any);
        anyFetched = true;
      }

      if (anyFetched) {
        setIsLoading(true);
      }
    },
    [documentId, selectedScenarios, getCrossRepData]
  );

  // Get cached data for a data type as a Map<scenarioId, data[]>
  const getDataForType = useCallback(
    (dataType: string): Map<string, any[]> => {
      const result = new Map<string, any[]>();
      for (const scenario of selectedScenarios) {
        const data = cacheRef.current.get(scenario.id)?.get(dataType);
        if (data) {
          result.set(scenario.id, data);
        }
      }
      return result;
    },
    [selectedScenarios]
  );

  return {
    selectedScenarios,
    availableScenarios,
    addScenario,
    removeScenario,
    getDataForType,
    isLoading,
    fetchDataType,
    availableScenariosLoading,
  };
}
```

**Step 2: Verify it compiles**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/hooks/useComparisonData.ts
git commit -m "feat: add useComparisonData hook for multi-scenario fetching and caching"
```

---

## Task 10: Evolve Dashboard — Multi-Scenario State + Picker

Wire the `useComparisonData` hook and `ScenarioPicker` into the existing `SimulationRunAnalysisDashboard`. This task focuses only on the wiring — the rendering changes come in subsequent tasks.

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SimulationRunAnalysisDashboard.tsx`

**Step 1: Add imports and hook**

Add at the top of the file:
```typescript
import ScenarioPicker from "../../components/ScenarioPicker";
import { useComparisonData } from "../../hooks/useComparisonData";
import {
  mergeBarChartData,
  mergeTimeseriesData,
  mergeTableColumns,
  mergeTableData,
} from "../../utils/scenarioDataMerge";
```

Inside the component, add the hook call:
```typescript
const {
  selectedScenarios,
  availableScenarios,
  addScenario,
  removeScenario,
  getDataForType,
  isLoading: comparisonLoading,
  fetchDataType,
  availableScenariosLoading,
} = useComparisonData(documentId, scenarioId);
```

Derive `isComparing`:
```typescript
const isComparing = selectedScenarios.length > 1;
```

**Step 2: Add ScenarioPicker to the header area**

Insert the picker between the Summary/Detailed toggle and the content area:

```typescript
{/* Scenario Picker — always visible */}
{!availableScenariosLoading && availableScenarios.length > 1 && (
  <ScenarioPicker
    selectedScenarios={selectedScenarios}
    availableScenarios={availableScenarios}
    onAdd={addScenario}
    onRemove={removeScenario}
  />
)}
```

**Step 3: Update data fetching to use the comparison hook**

Replace the existing `fetchSummaryData` and `fetchDetailedData` effects. When `isComparing` is true, use `fetchDataType` from the hook. When false, use existing single-scenario logic (preserve backwards compatibility).

For detailed view, when `dataType` changes or `selectedScenarios` changes:
```typescript
useEffect(() => {
  if (isComparing) {
    fetchDataType(dataType);
  } else {
    // Existing single-scenario fetch logic
    fetchDetailedData();
  }
}, [isComparing, dataType, selectedScenarios, fetchDataType, fetchDetailedData]);
```

For summary view, similar approach:
```typescript
useEffect(() => {
  if (viewType === "summary" && isComparing) {
    fetchDataType("scenario");
    fetchDataType("activity");
    fetchDataType("resource");
  } else if (viewType === "summary") {
    fetchSummaryData();
  }
}, [viewType, isComparing, fetchDataType, fetchSummaryData]);
```

**Step 4: Verify it compiles and single-scenario behavior is preserved**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: No type errors. With only 1 scenario selected, dashboard behaves exactly as before.

**Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SimulationRunAnalysisDashboard.tsx
git commit -m "feat: wire comparison hook and scenario picker into dashboard"
```

---

## Task 11: Evolve Dashboard — Summary View Comparison

When 2+ scenarios are selected, transform the summary view from single-scenario cards into comparison tables.

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SimulationRunAnalysisDashboard.tsx`

**Step 1: Create `renderComparisonSummaryView` function**

Add a new render function in the component:

```typescript
const renderComparisonSummaryView = () => {
  const scenarioDataMap = getDataForType("scenario");
  const activityDataMap = getDataForType("activity");
  const resourceDataMap = getDataForType("resource");

  if (comparisonLoading && scenarioDataMap.size === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-xs text-gray-500">Loading comparison data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* System Performance Comparison */}
      <div className="border border-gray-200 rounded">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">
            System Performance
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-2 py-1.5 font-medium text-gray-600">Metric</th>
                {selectedScenarios.map((s) => (
                  <th key={s.id} className="text-right px-2 py-1.5 font-medium text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: "total_throughput_mean", label: "Total Throughput", decimals: 0 },
                { key: "total_cost_mean", label: "Total Cost", decimals: 2 },
                { key: "avg_cycle_time_mean", label: "Avg Cycle Time", decimals: 2 },
                { key: "avg_time_in_system_mean", label: "Avg Time in System", decimals: 2 },
                { key: "avg_entities_in_system_mean", label: "Avg # in System", decimals: 2 },
              ].map(({ key, label, decimals }) => (
                <tr key={key} className="border-b border-gray-100">
                  <td className="px-2 py-1.5 text-gray-600">{label}</td>
                  {selectedScenarios.map((s) => {
                    const scenarioData = scenarioDataMap.get(s.id)?.[0];
                    return (
                      <td key={s.id} className="px-2 py-1.5 text-right font-medium">
                        {formatNumber(scenarioData?.[key], decimals)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activities Comparison */}
      <div className="border border-gray-200 rounded">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">Activities Summary</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-2 py-1.5 font-medium text-gray-600">Activity</th>
                {selectedScenarios.map((s) => (
                  <React.Fragment key={s.id}>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-600">
                      Util ({s.name.substring(0, 8)})
                    </th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-600">
                      Cycle ({s.name.substring(0, 8)})
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const merged = mergeTableData(selectedScenarios, activityDataMap, "activity_name");
                return merged.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
                    onClick={() => handleDrillDown("activity", row.activity_name)}
                  >
                    <td className="px-2 py-1.5 text-blue-600 truncate max-w-[100px]">
                      {row.activity_name}
                    </td>
                    {selectedScenarios.map((s) => (
                      <React.Fragment key={s.id}>
                        <td className="px-2 py-1.5 text-right">
                          {formatPercent(row[`utilization_mean_${s.name}`])}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {formatNumber(row[`cycle_time_mean_${s.name}`], 1)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resources Comparison — same pattern as Activities */}
      <div className="border border-gray-200 rounded">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">Resource Summary</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-2 py-1.5 font-medium text-gray-600">Resource</th>
                {selectedScenarios.map((s) => (
                  <React.Fragment key={s.id}>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-600">
                      Util ({s.name.substring(0, 8)})
                    </th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-600">
                      Cost ({s.name.substring(0, 8)})
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const merged = mergeTableData(selectedScenarios, resourceDataMap, "resource_name");
                return merged.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
                    onClick={() => handleDrillDown("resource", row.resource_name)}
                  >
                    <td className="px-2 py-1.5 text-blue-600 truncate max-w-[120px]">
                      {row.resource_name}
                    </td>
                    {selectedScenarios.map((s) => (
                      <React.Fragment key={s.id}>
                        <td className="px-2 py-1.5 text-right">
                          {formatPercent(row[`utilization_mean_${s.name}`])}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {formatNumber(row[`total_cost_mean_${s.name}`], 2)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
```

**Step 2: Wire into the main render**

Update the content conditional at the bottom of the component:

```typescript
{viewType === "summary"
  ? (isComparing ? renderComparisonSummaryView() : renderSummaryView())
  : renderDetailedView()}
```

**Step 3: Verify it compiles**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: No type errors.

**Step 4: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SimulationRunAnalysisDashboard.tsx
git commit -m "feat: add comparison summary view for multi-scenario dashboard"
```

---

## Task 12: Evolve Dashboard — Detailed View Charts for Comparison

When comparing, overlay multiple scenario series on charts (bar charts and timeseries).

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SimulationRunAnalysisDashboard.tsx`

**Step 1: Create `renderComparisonChart` function**

Add a new render function. This parallels the existing `renderChart()` but uses merged data:

```typescript
const renderComparisonChart = () => {
  const dataMap = getDataForType(dataType);

  const isTimeseriesType =
    dataType === "activity-contents-timeseries" ||
    dataType === "activity-inbound-queue-timeseries" ||
    dataType === "activity-outbound-queue-timeseries" ||
    dataType === "state-values-timeseries" ||
    dataType === "entity-throughput-timeseries";

  if (isTimeseriesType) {
    const merged = mergeTimeseriesData(
      selectedScenarios,
      dataMap,
      "object_id",
      "period_start_clock",
      "mean"
    );

    // Expanded single-object view
    if (expandedActivity) {
      const objectData = merged.data.filter(
        (d: any) => d.object_id === expandedActivity
      );
      return (
        <ChartContainer
          data={objectData}
          loading={comparisonLoading}
          error={null}
          emptyMessage={`No data available for ${expandedActivity}`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700">{expandedActivity}</h3>
              <button
                onClick={() => setExpandedActivity(null)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Back to grid
              </button>
            </div>
            <TimeseriesChart
              data={objectData}
              xKey="period_start_clock"
              yKeys={merged.yKeys}
              colors={merged.colors}
              height={400}
            />
          </div>
        </ChartContainer>
      );
    }

    // Sparkline grid with multi-series
    return (
      <ChartContainer
        data={merged.data}
        loading={comparisonLoading}
        error={null}
        emptyMessage={`No ${dataType} data available`}
      >
        <SparklineGrid
          data={merged.data}
          groupByKey="object_id"
          xKey="period_start_clock"
          yKeys={merged.yKeys}
          colors={merged.colors}
          onItemClick={(id) => setExpandedActivity(id)}
          sparklineHeight={50}
        />
      </ChartContainer>
    );
  }

  // Bar chart for summary types
  if (metricOptions[dataType]) {
    const nameKey =
      dataType === "activity" ? "activity_name"
        : dataType === "entity" ? "entity_name"
        : dataType === "resource" ? "resource_name"
        : dataType === "activity-entity" ? "activity_name"
        : dataType === "state-summary" ? "state_name"
        : "scenario_name";

    const merged = mergeBarChartData(selectedScenarios, dataMap, nameKey, selectedMetric);

    return (
      <ChartContainer
        data={merged.data}
        loading={comparisonLoading}
        error={null}
        emptyMessage={`No ${dataType} data available`}
      >
        <ComparisonBarChart
          data={merged.data}
          xKey={nameKey}
          yKeys={merged.yKeys}
          colors={merged.colors}
          height={300}
          layout="vertical"
        />
      </ChartContainer>
    );
  }

  return null;
};
```

**Step 2: Wire into the detailed view render**

In `renderDetailedView`, update the chart section:

```typescript
{(viewMode === "chart" || viewMode === "both") && (
  <div className="space-y-2">
    {isComparing ? renderComparisonChart() : renderChart()}
  </div>
)}
```

**Step 3: Verify it compiles**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: No type errors.

**Step 4: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SimulationRunAnalysisDashboard.tsx
git commit -m "feat: add comparison chart rendering for multi-scenario detailed view"
```

---

## Task 13: Evolve Dashboard — Detailed View Tables for Comparison

When comparing, show merged table columns with scenario-suffixed headers.

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SimulationRunAnalysisDashboard.tsx`

**Step 1: Compute merged columns and data for comparison mode**

Add a memo for comparison table data:

```typescript
const comparisonTableData = React.useMemo(() => {
  if (!isComparing) return { columns, data: filteredData };

  const dataMap = getDataForType(dataType);
  const baseColumns = getColumnsForDataType(dataType);

  // Determine the name key for this data type
  const nameKey =
    dataType === "activity" ? "activity_name"
      : dataType === "entity" ? "entity_name"
      : dataType === "resource" ? "resource_name"
      : dataType === "activity-entity" ? "activity_name"
      : dataType === "state-summary" ? "state_name"
      : dataType === "scenario" ? "scenario_name"
      : "object_id";

  const mergedColumns = mergeTableColumns(selectedScenarios, baseColumns, nameKey);
  const mergedData = mergeTableData(selectedScenarios, dataMap, nameKey);

  return { columns: mergedColumns, data: mergedData };
}, [isComparing, dataType, selectedScenarios, getDataForType, filteredData, columns]);
```

**Step 2: Use merged data in the DataTable**

In `renderDetailedView`, update the DataTable usage:

```typescript
{(viewMode === "table" || viewMode === "both") && (
  <DataTable
    data={isComparing ? comparisonTableData.data : filteredData}
    columns={isComparing ? comparisonTableData.columns : columns}
    loading={isComparing ? comparisonLoading : loading}
    error={isComparing ? null : error}
    emptyMessage={`No ${dataType} data available for this run`}
  />
)}
```

**Step 3: Verify it compiles**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: No type errors.

**Step 4: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SimulationRunAnalysisDashboard.tsx
git commit -m "feat: add comparison table rendering for multi-scenario detailed view"
```

---

## Task 14: Integration Verification

End-to-end verification that the feature works correctly.

**Step 1: Build all components**

```bash
npm run build -w @quodsi/shared
cd editorextensions/quodsi_editor_extension && npx tsc --noEmit
cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit
```

Expected: All builds succeed.

**Step 2: Run all tests**

```bash
cd shared && npm test
cd editorextensions/quodsi_editor_extension/quodsim-react && npx jest --no-coverage
```

Expected: All tests pass including the new `scenarioDataMerge` tests.

**Step 3: Manual testing checklist**

1. Open a document with 2+ completed scenarios
2. Click "View Results" on any scenario → verify single-scenario view works as before
3. Verify ScenarioPicker appears with the current scenario chip and "Add" button
4. Add a second scenario → verify:
   - Summary view shows comparison tables (System Performance, Activities, Resources)
   - Detailed view bar charts show grouped bars per scenario
   - Detailed view tables show scenario-suffixed columns
5. Switch to a timeseries data type → verify overlaid lines with legend
6. Click a sparkline → verify expanded view shows overlaid timeseries
7. Remove a scenario → verify return to single-scenario view
8. Try adding up to 5 scenarios → verify max cap and "Add" button disables
9. Switch between data types → verify caching (previously loaded types should not show loading)

**Step 4: Commit any fixes**

If any issues are found during manual testing, fix and commit each individually.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: scenario comparison — multi-scenario overlay in analysis dashboard"
```
