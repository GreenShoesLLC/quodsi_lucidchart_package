import { TableColumn } from "../../components/DataTable";

// Formatting helper functions
const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return `${(value * 100).toFixed(2)}%`;
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
    key: "waiting_time_mean",
    label: "Wait",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "queue_length_mean",
    label: "Queue",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "queue_length_max",
    label: "MaxQ",
    format: (v) => formatDecimal(v, 2),
  },
  {
    key: "arrivals_mean",
    label: "Arrivals",
    format: formatInteger,
  },
  {
    key: "captures_mean",
    label: "Captures",
    format: formatInteger,
  },
  {
    key: "releases_mean",
    label: "Releases",
    format: formatInteger,
  },
];

// Entity Cross-Rep Summary Columns
export const entityColumns: TableColumn[] = [
  {
    key: "entity_name",
    label: "Name",
  },
  {
    key: "count_mean",
    label: "Count",
    format: formatInteger,
  },
  {
    key: "completed_count_mean",
    label: "Done",
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
    key: "time_in_system_median",
    label: "Med Sys",
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
    format: formatPercent,
  },
  {
    key: "percent_operation_mean",
    label: "% Op",
    format: formatPercent,
  },
  {
    key: "percent_blocked_mean",
    label: "% Block",
    format: formatPercent,
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
];

export type CrossRepDataType = "activity" | "entity" | "resource";

export const getColumnsForDataType = (dataType: CrossRepDataType): TableColumn[] => {
  switch (dataType) {
    case "activity":
      return activityColumns;
    case "entity":
      return entityColumns;
    case "resource":
      return resourceColumns;
    default:
      return [];
  }
};
