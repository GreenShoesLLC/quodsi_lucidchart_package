import { TableColumn } from "../../components/DataTable";

// Formatting helper functions
// For values in 0-1 range (like utilization 0.85 -> 85%)
const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return `${(value * 100).toFixed(2)}%`;
};

// For values already in 0-100 range (like entity percents 81.58 -> 81.58%)
const formatPercentRaw = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return `${value.toFixed(2)}%`;
};

const formatDecimal = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return value.toFixed(decimals);
};

const formatInteger = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return Math.round(value).toString();
};

// Activity Cross-Rep Summary Columns
export const activityColumns: TableColumn[] = [
  {
    key: "activity_name",
    label: "Name",
  },
  {
    key: "utilization_mean",
    label: "Util %",
    format: formatPercent,
  },
  {
    key: "utilization_max",
    label: "Max %",
    format: formatPercent,
  },
  {
    key: "utilization_std_dev",
    label: "StdDev",
    format: (v) => formatDecimal(v, 3),
  },
  {
    key: "cycle_time_mean",
    label: "Cycle",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "cycle_time_median",
    label: "Med Cyc",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "total_time_waiting_for_resource_mean",
    label: "Total Time Waiting",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "total_arrivals_mean",
    label: "Total Arrivals",
    format: formatInteger,
  },
  {
    key: "total_allocations_mean",
    label: "Total Allocations",
    format: formatInteger,
  },
  {
    key: "throughput_mean",
    label: "Throughput",
    format: formatInteger,
  },
  {
    key: "total_cost_mean",
    label: "Total Cost",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "inbound_queue_stats_mean",
    label: "Inbound Q",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "outbound_queue_stats_mean",
    label: "Outbound Q",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "inbound_queue_avg_contents_mean",
    label: "Inbound Avg",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "outbound_queue_avg_contents_mean",
    label: "Outbound Avg",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "total_avg_contents_mean",
    label: "Total Avg",
    format: (v) => formatDecimal(v, 2),
  },
];

// Entity Cross-Rep Summary Columns
export const entityColumns: TableColumn[] = [
  {
    key: "entity_name",
    label: "Name",
  },
  {
    key: "created_mean",
    label: "Created",
    format: formatInteger,
  },
  {
    key: "completed_count_mean",
    label: "Exits",
    format: formatInteger,
  },
  {
    key: "in_progress_count_mean",
    label: "WIP",
    format: formatInteger,
  },
  {
    key: "throughput_rate_mean",
    label: "Thruput",
    format: (v) => formatDecimal(v, 3),
  },
  {
    key: "time_in_system_mean",
    label: "Sys Time",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "time_waiting_mean",
    label: "Wait",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "time_in_operation_mean",
    label: "Op Time",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "percent_waiting_mean",
    label: "% Wait",
    format: formatPercentRaw,
  },
  {
    key: "percent_operation_mean",
    label: "% Op",
    format: formatPercentRaw,
  },
  {
    key: "percent_blocked_mean",
    label: "% Block",
    format: formatPercentRaw,
  },
  {
    key: "trough_wip_mean",
    label: "Trough WIP",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "peak_wip_mean",
    label: "Peak WIP",
    format: (v) => formatDecimal(v, 2),
  },
];

// Scenario Cross-Rep Summary Columns
export const scenarioColumns: TableColumn[] = [
  {
    key: "scenario_name",
    label: "Scenario",
  },
  {
    key: "total_throughput_mean",
    label: "Throughput",
    format: formatInteger,
  },
  {
    key: "total_entities_created_mean",
    label: "Created",
    format: formatInteger,
  },
  {
    key: "entities_in_progress_mean",
    label: "WIP",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "avg_cycle_time_mean",
    label: "Cycle Time",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "avg_time_in_system_mean",
    label: "Sys Time",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "avg_entities_in_system_mean",
    label: "Avg In Sys",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "total_cost_mean",
    label: "Total Cost",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "num_replications",
    label: "Reps",
    format: formatInteger,
  },
];

// Resource Cross-Rep Summary Columns
export const resourceColumns: TableColumn[] = [
  {
    key: "resource_name",
    label: "Name",
  },
  {
    key: "utilization_mean",
    label: "Util %",
    format: formatPercent,
  },
  {
    key: "utilization_min",
    label: "Min %",
    format: formatPercent,
  },
  {
    key: "utilization_max",
    label: "Max %",
    format: formatPercent,
  },
  {
    key: "utilization_std_dev",
    label: "StdDev",
    format: (v) => formatDecimal(v, 3),
  },
  {
    key: "bottleneck_frequency",
    label: "Bottleneck",
    format: formatInteger,
  },
  {
    key: "total_cost_mean",
    label: "Total Cost",
    format: (v) => formatDecimal(v, 2),
  },
];

// Activity Contents Timeseries Columns
export const activityContentsTimeseriesColumns: TableColumn[] = [
  {
    key: "object_id",
    label: "Activity",
  },
  {
    key: "period_start_clock",
    label: "Time",
    format: (v) => formatDecimal(v, 1),
  },
  {
    key: "mean",
    label: "Mean",
    format: (v) => formatDecimal(v, 3),
  },
  {
    key: "std",
    label: "StdDev",
    format: (v) => formatDecimal(v, 3),
  },
  {
    key: "min",
    label: "Min",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "max",
    label: "Max",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "sample_size",
    label: "N",
    format: formatInteger,
  },
];

// Activity Entity Summary Columns
export const activityEntityColumns: TableColumn[] = [
  {
    key: "activity_name",
    label: "Activity",
  },
  {
    key: "entity_type",
    label: "Entity Type",
  },
  {
    key: "entity_count_mean",
    label: "Count",
    format: formatInteger,
  },
  {
    key: "completed_count_mean",
    label: "Done",
    format: formatInteger,
  },
  {
    key: "avg_cycle_time_mean",
    label: "Cycle",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "activity_avg_contents_mean",
    label: "Contents",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "total_cost_mean",
    label: "Cost",
    format: (v) => formatDecimal(v, 2),
  },
];

// State Summary Columns
export const stateSummaryColumns: TableColumn[] = [
  {
    key: "component_type",
    label: "Type",
  },
  {
    key: "component_name",
    label: "Component",
  },
  {
    key: "state_name",
    label: "State",
  },
  {
    key: "state_type",
    label: "DataType",
  },
  {
    key: "mean_change_count",
    label: "Changes",
    format: (v) => formatDecimal(v, 1),
  },
  {
    key: "mean_final_value",
    label: "Final",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "final_value_std_dev",
    label: "FinalSD",
    format: (v) => formatDecimal(v, 3),
  },
  {
    key: "mean_time_weighted_avg",
    label: "Avg",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "mean_min_value",
    label: "Min",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "mean_max_value",
    label: "Max",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "most_common_category",
    label: "Category",
  },
  {
    key: "num_replications",
    label: "N",
    format: formatInteger,
  },
];

export type CrossRepDataType = "scenario" | "activity" | "entity" | "resource" | "activity-entity" | "activity-contents-timeseries" | "state-summary" | "activity-inbound-queue-timeseries" | "activity-outbound-queue-timeseries" | "state-values-timeseries" | "entity-throughput-timeseries";

export const getColumnsForDataType = (dataType: CrossRepDataType): TableColumn[] => {
  switch (dataType) {
    case "scenario":
      return scenarioColumns;
    case "activity":
      return activityColumns;
    case "entity":
      return entityColumns;
    case "resource":
      return resourceColumns;
    case "activity-entity":
      return activityEntityColumns;
    case "activity-contents-timeseries":
      return activityContentsTimeseriesColumns;
    case "activity-inbound-queue-timeseries":
      return activityContentsTimeseriesColumns;
    case "activity-outbound-queue-timeseries":
      return activityContentsTimeseriesColumns;
    case "state-summary":
      return stateSummaryColumns;
    case "state-values-timeseries":
      return activityContentsTimeseriesColumns;
    case "entity-throughput-timeseries":
      return activityContentsTimeseriesColumns;
    default:
      return [];
  }
};
