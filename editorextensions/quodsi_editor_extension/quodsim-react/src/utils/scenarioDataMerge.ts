import { TableColumn } from "../components/DataTable";

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
