// Format helpers for summary and detailed views

export const formatNumber = (
  value: number | null | undefined,
  decimals: number = 2
): string => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return value.toFixed(decimals);
};

export const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
};

// Metrics stored as 0-1 decimals that should display as percentages (multiply by 100)
const DECIMAL_PERCENT_METRICS = new Set([
  "capacity_utilization_mean",
  "capacity_utilization_max",
  "capacity_utilization_min",
  "capacity_utilization_std_dev",
  "active_time_pct_mean",
  "active_time_pct_max",
  "active_time_pct_min",
  "active_time_pct_std_dev",
]);

// Metrics already stored as 0-100 that just need a "%" suffix
const RAW_PERCENT_METRICS = new Set([
  "percent_resource_wait_mean",
  "percent_operation_mean",
  "percent_queue_wait_mean",
]);

const formatDecimalAsPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatRawAsPercent = (value: number): string => `${value.toFixed(1)}%`;

export const getPercentFormatter = (metric: string): ((value: number) => string) | undefined => {
  if (DECIMAL_PERCENT_METRICS.has(metric)) return formatDecimalAsPercent;
  if (RAW_PERCENT_METRICS.has(metric)) return formatRawAsPercent;
  return undefined;
};

// Metric options for chart by data type
export const metricOptions: Record<string, { value: string; label: string }[]> = {
  activity: [
    { value: "capacity_utilization_mean", label: "Capacity Utilization (Mean)" },
    { value: "capacity_utilization_max", label: "Capacity Utilization (Max)" },
    { value: "capacity_utilization_std_dev", label: "Capacity Utilization (Std Dev)" },
    { value: "active_time_pct_mean", label: "Active Time % (Mean)" },
    { value: "active_time_pct_max", label: "Active Time % (Max)" },
    { value: "active_time_pct_std_dev", label: "Active Time % (Std Dev)" },
    { value: "cycle_time_mean", label: "Cycle Time (Mean)" },
    { value: "cycle_time_median", label: "Cycle Time (Median)" },
    { value: "total_time_resource_wait_for_resource_mean", label: "Time Waiting for Resource" },
    { value: "total_time_in_failure_mean", label: "Time In Failure" },
    { value: "total_arrivals_mean", label: "Total Arrivals" },
    { value: "total_allocations_mean", label: "Total Allocations" },
    { value: "throughput_mean", label: "Throughput" },
    { value: "total_cost_mean", label: "Total Cost" },
    { value: "inbound_queue_stats_mean", label: "Inbound Queue (Mean)" },
    { value: "outbound_queue_stats_mean", label: "Outbound Queue (Mean)" },
    { value: "inbound_queue_avg_contents_mean", label: "Inbound Queue Avg Contents" },
    { value: "outbound_queue_avg_contents_mean", label: "Outbound Queue Avg Contents" },
    { value: "total_avg_contents_mean", label: "Total Avg Contents" },
  ],
  entity: [
    { value: "created_mean", label: "Created" },
    { value: "completed_count_mean", label: "Completed Count" },
    { value: "in_progress_count_mean", label: "In Progress (WIP)" },
    { value: "throughput_rate_mean", label: "Throughput Rate" },
    { value: "time_in_system_mean", label: "Time in System" },
    { value: "time_resource_wait_mean", label: "Time Resource Wait" },
    { value: "time_in_operation_mean", label: "Time in Operation" },
    { value: "percent_resource_wait_mean", label: "% Resource Wait" },
    { value: "percent_operation_mean", label: "% In Operation" },
    { value: "percent_queue_wait_mean", label: "% Queue Wait" },
    { value: "trough_wip_mean", label: "Trough WIP" },
    { value: "peak_wip_mean", label: "Peak WIP" },
  ],
  resource: [
    { value: "capacity_utilization_mean", label: "Capacity Utilization (Mean)" },
    { value: "capacity_utilization_min", label: "Capacity Utilization (Min)" },
    { value: "capacity_utilization_max", label: "Capacity Utilization (Max)" },
    { value: "capacity_utilization_std_dev", label: "Capacity Utilization (Std Dev)" },
    { value: "active_time_pct_mean", label: "Active Time % (Mean)" },
    { value: "active_time_pct_min", label: "Active Time % (Min)" },
    { value: "active_time_pct_max", label: "Active Time % (Max)" },
    { value: "active_time_pct_std_dev", label: "Active Time % (Std Dev)" },
    { value: "seize_cost_mean", label: "Seize Cost" },
    { value: "utilization_cost_mean", label: "Utilization Cost" },
    { value: "idle_cost_mean", label: "Idle Cost" },
    { value: "total_cost_mean", label: "Total Cost" },
  ],
  "activity-entity": [
    { value: "entity_count_mean", label: "Entity Count" },
    { value: "completed_count_mean", label: "Completed Count" },
    { value: "avg_cycle_time_mean", label: "Avg Cycle Time" },
    { value: "avg_captured_time_mean", label: "Avg Captured Time" },
    { value: "avg_blocked_time_mean", label: "Avg Blocked Time" },
    { value: "avg_failure_time_mean", label: "Avg Failure Time" },
    { value: "total_failure_time_mean", label: "Total Failure Time" },
    { value: "activity_avg_contents_mean", label: "Activity Contents" },
    { value: "inbound_q_avg_contents_mean", label: "Inbound Queue" },
    { value: "outbound_q_avg_contents_mean", label: "Outbound Queue" },
    { value: "total_cost_mean", label: "Total Cost" },
  ],
  "state-summary": [
    { value: "mean_final_value", label: "Final Value" },
    { value: "mean_min_value", label: "Min Value" },
    { value: "mean_max_value", label: "Max Value" },
    { value: "mean_time_weighted_avg", label: "Time-Weighted Avg" },
    { value: "mean_change_count", label: "Change Count" },
  ],
  scenario: [
    { value: "total_throughput_mean", label: "Total Throughput" },
    { value: "total_entities_created_mean", label: "Entities Created" },
    { value: "entities_in_progress_mean", label: "Entities In Progress" },
    { value: "avg_cycle_time_mean", label: "Avg Cycle Time" },
    { value: "avg_time_in_system_mean", label: "Avg Time in System" },
    { value: "avg_entities_in_system_mean", label: "Avg Entities in System" },
    { value: "total_cost_mean", label: "Total Cost" },
  ],
};
