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
