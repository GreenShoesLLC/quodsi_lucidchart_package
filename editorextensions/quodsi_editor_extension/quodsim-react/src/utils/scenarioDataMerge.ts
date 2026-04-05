import { TableColumn } from "../components/DataTable";
import { CHART_COLORS } from "../components/charts/chartColors";

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
  dataMap.forEach((rows) => {
    for (const row of rows) {
      if (row[nameKey]) allNames.add(row[nameKey]);
    }
  });

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

  // Build a lookup: (groupValue, xValue) -> merged row
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

/**
 * Creates merged column definitions for multi-scenario tables.
 * The name column stays unchanged; metric columns are duplicated per scenario.
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
 * Joins on nameKey.
 */
export function mergeTableData(
  scenarios: SelectedScenario[],
  dataMap: Map<string, any[]>,
  nameKey: string
): Record<string, any>[] {
  if (scenarios.length === 1) {
    return dataMap.get(scenarios[0].id) || [];
  }

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

interface PivotedTimeseriesData {
  data: Record<string, any>[];
  yKeys: string[];
  colors: string[];
}

/**
 * Pivots flat timeseries data so each selected object becomes its own column.
 * Input rows: { object_id, period_start_clock, mean, ... }
 * Output rows: { period_start_clock, "Object A": meanA, "Object B": meanB, ... }
 */
export function pivotTimeseriesByObject(
  data: any[],
  selectedIds: string[],
  xKey: string,
  yKey: string,
  groupKey: string
): PivotedTimeseriesData {
  const yKeys = selectedIds;
  const colors = selectedIds.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  const rowMap = new Map<number | string, Record<string, any>>();

  for (const row of data) {
    const objectId = row[groupKey];
    if (!selectedIds.includes(objectId)) continue;

    const xVal = row[xKey];
    if (!rowMap.has(xVal)) {
      const newRow: Record<string, any> = { [xKey]: xVal };
      for (const id of selectedIds) {
        newRow[id] = null;
      }
      rowMap.set(xVal, newRow);
    }
    rowMap.get(xVal)![objectId] = row[yKey];
  }

  const sorted = Array.from(rowMap.values()).sort((a, b) => {
    const aVal = a[xKey];
    const bVal = b[xKey];
    if (typeof aVal === "number" && typeof bVal === "number") return aVal - bVal;
    return String(aVal).localeCompare(String(bVal));
  });

  return { data: sorted, yKeys, colors };
}

/**
 * Builds a formatter that shortens dot-separated object IDs
 * (e.g., "Model.Model.Arrivals") to the shortest unambiguous suffix.
 *
 * If all state names (last segment) are unique → just "Arrivals"
 * If duplicates exist → "ComponentName.StateName" (e.g., "Registration.count")
 * Falls back to the full ID if still ambiguous.
 */
export function buildShortNameFormatter(objectIds: string[]): (id: string) => string {
  // Parse each ID into segments
  const parsed = objectIds.map(id => {
    const parts = id.split(".");
    return { full: id, parts };
  });

  // Try shortest suffix first (just state name), then progressively longer
  const cache = new Map<string, string>();

  // Check if last segment alone is unique
  const lastSegments = parsed.map(p => p.parts[p.parts.length - 1]);
  const lastSegmentCounts = new Map<string, number>();
  for (const seg of lastSegments) {
    lastSegmentCounts.set(seg, (lastSegmentCounts.get(seg) || 0) + 1);
  }

  for (const { full, parts } of parsed) {
    const stateName = parts[parts.length - 1];
    if (lastSegmentCounts.get(stateName) === 1) {
      // Unique — just use state name
      cache.set(full, stateName);
    } else if (parts.length >= 2) {
      // Disambiguate with component name
      cache.set(full, parts.slice(-2).join("."));
    } else {
      cache.set(full, full);
    }
  }

  return (id: string) => cache.get(id) ?? id;
}
