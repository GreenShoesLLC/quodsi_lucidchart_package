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
