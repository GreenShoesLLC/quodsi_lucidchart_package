import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  BarChart3,
  Table2,
  LayoutGrid,
  Download,
  Check,
  List,
  X,
} from "lucide-react";
import { EnvelopeMessageType, SimulationRunDownloadInfo } from "@quodsi/shared";
import { useSimulationRunSender } from "../../../messaging/senders/simulationRunSender";
import DataTable from "../../../components/DataTable";
import {
  ChartContainer,
  TimeseriesChart,
  ComparisonBarChart,
  SparklineGrid,
  ExpandedTimeseriesChart,
} from "../../../components/charts";
import {
  CrossRepDataType,
  getColumnsForDataType,
} from "./crossRepTableConfigs";
import ScenarioPicker from "../../../components/ScenarioPicker";
import { useComparisonData } from "../../../hooks/useComparisonData";
import {
  mergeBarChartData,
  mergeTimeseriesData,
  mergeTableColumns,
  mergeTableData,
  pivotTimeseriesByObject,
  buildShortNameFormatter,
} from "../../../utils/scenarioDataMerge";

interface SimulationRunAnalysisDashboardProps {
  scenarioId: string;
  documentId: string;
  onBackToList?: () => void;
  downloadInfo?: SimulationRunDownloadInfo;
}

// Summary data structure
interface SummaryData {
  scenario: any | null;
  activities: any[];
  resources: any[];
}

// Format helpers for summary view
const formatNumber = (
  value: number | null | undefined,
  decimals: number = 2
): string => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return value.toFixed(decimals);
};

const formatPercent = (value: number | null | undefined): string => {
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

const getPercentFormatter = (metric: string): ((value: number) => string) | undefined => {
  if (DECIMAL_PERCENT_METRICS.has(metric)) return formatDecimalAsPercent;
  if (RAW_PERCENT_METRICS.has(metric)) return formatRawAsPercent;
  return undefined;
};

// Metric options for chart by data type
const metricOptions: Record<string, { value: string; label: string }[]> = {
  activity: [
    { value: "capacity_utilization_mean", label: "Capacity Utilization (Mean)" },
    { value: "capacity_utilization_max", label: "Capacity Utilization (Max)" },
    { value: "capacity_utilization_std_dev", label: "Capacity Utilization (Std Dev)" },
    { value: "active_time_pct_mean", label: "Active Time % (Mean)" },
    { value: "active_time_pct_max", label: "Active Time % (Max)" },
    { value: "active_time_pct_std_dev", label: "Active Time % (Std Dev)" },
    { value: "cycle_time_mean", label: "Cycle Time (Mean)" },
    { value: "cycle_time_median", label: "Cycle Time (Median)" },
    {
      value: "total_time_resource_wait_for_resource_mean",
      label: "Time Waiting for Resource",
    },
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

const SimulationRunAnalysisDashboard: React.FC<SimulationRunAnalysisDashboardProps> = ({
  scenarioId,
  documentId,
  onBackToList,
  downloadInfo,
}) => {
  // View type: summary (compact) or detailed (existing tables/charts)
  const [viewType, setViewType] = useState<"summary" | "detailed">("summary");

  // Summary view state
  const [summaryData, setSummaryData] = useState<SummaryData>({
    scenario: null,
    activities: [],
    resources: [],
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const summaryDataReceived = useRef({
    scenario: false,
    activity: false,
    resource: false,
  });

  // Detailed view state (existing)
  const [dataType, setDataType] = useState<CrossRepDataType>("activity");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "chart" | "both">("both");
  const [zipCopied, setZipCopied] = useState<boolean>(false);
  const [selectedMetric, setSelectedMetric] =
    useState<string>("capacity_utilization_mean");

  // Selected objects for timeseries multi-select overlay
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());

  const toggleObjectSelection = useCallback((objectId: string) => {
    setSelectedObjects(prev => {
      const next = new Set(prev);
      if (next.has(objectId)) {
        next.delete(objectId);
      } else {
        next.add(objectId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedObjects(new Set());
  }, []);

  // Hooks
  const { getCrossRepData } = useSimulationRunSender();

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

  const isComparing = selectedScenarios.length > 1;

  // Handle ZIP download link copy
  const handleCopyZipLink = () => {
    if (!downloadInfo?.zipUrl) return;

    try {
      const textarea = document.createElement("textarea");
      textarea.value = downloadInfo.zipUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (successful) {
        console.log("[SimulationRunAnalysisDashboard] ZIP link copied to clipboard");
        setZipCopied(true);
        setTimeout(() => setZipCopied(false), 2000);
      } else {
        console.error("[SimulationRunAnalysisDashboard] execCommand copy failed");
      }
    } catch (error) {
      console.error(
        "[SimulationRunAnalysisDashboard] Failed to copy ZIP link:",
        error
      );
    }
  };

  // Handle drill-down from Summary to Detailed view
  const handleDrillDown = (type: CrossRepDataType, filterValue?: string) => {
    setDataType(type);
    if (filterValue) {
      setSelectedActivity(filterValue);
    }
    setViewType("detailed");
  };

  // Fetch summary data (all 3 types in parallel)
  const fetchSummaryData = useCallback(() => {
    if (!documentId || !scenarioId) return;

    console.log("[SimulationRunAnalysisDashboard] Fetching summary data...");
    setSummaryLoading(true);
    summaryDataReceived.current = {
      scenario: false,
      activity: false,
      resource: false,
    };

    // Fetch all 3 data types
    getCrossRepData(documentId, scenarioId, "scenario");
    getCrossRepData(documentId, scenarioId, "activity");
    getCrossRepData(documentId, scenarioId, "resource");
  }, [documentId, scenarioId, getCrossRepData]);

  // Fetch detailed data (single type)
  const fetchDetailedData = useCallback(() => {
    if (!documentId || !scenarioId) {
      setError("Missing documentId or scenarioId");
      return;
    }

    setLoading(true);
    setError(null);
    setData([]);

    console.log(
      `[SimulationRunAnalysisDashboard] Fetching ${dataType} data for scenario ${scenarioId}`
    );

    getCrossRepData(documentId, scenarioId, dataType);
  }, [documentId, scenarioId, dataType, getCrossRepData]);

  // Fetch data based on view type
  useEffect(() => {
    if (viewType === "summary") {
      fetchSummaryData();
    } else {
      fetchDetailedData();
    }
  }, [viewType, fetchSummaryData, fetchDetailedData]);

  // Fetch comparison data when scenarios or data type change
  useEffect(() => {
    if (isComparing) {
      if (viewType === "summary") {
        fetchDataType("scenario");
        fetchDataType("activity");
        fetchDataType("resource");
      } else {
        fetchDataType(dataType);
      }
    }
  }, [isComparing, viewType, dataType, selectedScenarios.map(s => s.id).join(","), fetchDataType]);

  // Listen for data responses
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === EnvelopeMessageType.CROSS_REP_DATA_RESULT) {
        console.log(
          "[SimulationRunAnalysisDashboard] Received cross-rep data:",
          message.data
        );

        const {
          dataType: receivedType,
          success,
          data: receivedData,
        } = message.data;

        // Handle summary view data
        if (viewType === "summary") {
          if (success) {
            // Update refs BEFORE setSummaryData so they're synchronous
            if (receivedType === "scenario") {
              summaryDataReceived.current.scenario = true;
              setSummaryData((prev) => ({
                ...prev,
                scenario: receivedData?.[0] || null,
              }));
            } else if (receivedType === "activity") {
              summaryDataReceived.current.activity = true;
              setSummaryData((prev) => ({
                ...prev,
                activities: receivedData || [],
              }));
            } else if (receivedType === "resource") {
              summaryDataReceived.current.resource = true;
              setSummaryData((prev) => ({
                ...prev,
                resources: receivedData || [],
              }));
            }

            // Now this check works because refs were updated synchronously above
            if (
              summaryDataReceived.current.scenario &&
              summaryDataReceived.current.activity &&
              summaryDataReceived.current.resource
            ) {
              setSummaryLoading(false);
            }
          }
        }

        // Handle detailed view data
        if (viewType === "detailed" && receivedType === dataType) {
          if (success) {
            setData(receivedData || []);
            setLoading(false);
          } else {
            setError(message.data.error || "Failed to fetch data");
            setLoading(false);
          }
        }
      }

      // Handle error response
      if (message.type === EnvelopeMessageType.ERROR) {
        if (
          message.data?.relatedTo === EnvelopeMessageType.CROSS_REP_DATA_REQUEST
        ) {
          console.error("[SimulationRunAnalysisDashboard] Error:", message.data);
          if (viewType === "detailed" && message.data?.dataType === dataType) {
            setError(message.data.message || "An error occurred");
            setLoading(false);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [viewType, dataType]);

  // Get columns for current data type (detailed view)
  const columns = getColumnsForDataType(dataType);

  // Check if data type supports filtering
  const isFilterableType =
    dataType === "activity" ||
    dataType === "entity" ||
    dataType === "resource" ||
    dataType === "activity-entity" ||
    dataType === "activity-contents-timeseries" ||
    dataType === "activity-inbound-queue-timeseries" ||
    dataType === "activity-outbound-queue-timeseries" ||
    dataType === "state-values-timeseries" ||
    dataType === "entity-throughput-timeseries";

  // Compute the filter key for the current data type
  const filterKey = React.useMemo(() => {
    if (dataType === "activity") return "activity_name";
    if (dataType === "entity") return "entity_name";
    if (dataType === "resource") return "resource_name";
    if (dataType === "activity-entity") return "activity_name";
    return "object_id"; // timeseries types
  }, [dataType]);

  // Filter a comparison dataMap by the selected activity/entity/resource
  const filterDataMap = React.useCallback(
    (dataMap: Map<string, any[]>): Map<string, any[]> => {
      if (selectedActivity === "all") return dataMap;
      const filtered = new Map<string, any[]>();
      dataMap.forEach((rows, scenarioId) => {
        filtered.set(scenarioId, rows.filter((row: any) => row[filterKey] === selectedActivity));
      });
      return filtered;
    },
    [selectedActivity, filterKey]
  );

  // Get unique items for filtering based on data type
  const uniqueFilterItems = React.useMemo(() => {
    if (!isFilterableType) return [];

    if (isComparing) {
      // Derive filter items from all scenarios' data
      const dataMap = getDataForType(dataType);
      const allItems = new Set<string>();
      dataMap.forEach((rows) => {
        for (const row of rows) {
          if (row[filterKey]) allItems.add(row[filterKey]);
        }
      });
      return Array.from(allItems).sort();
    }

    if (data.length === 0) return [];
    const items = Array.from(new Set(data.map((item: any) => item[filterKey])))
      .filter(Boolean)
      .sort();
    return items as string[];
  }, [data, dataType, isFilterableType, filterKey, isComparing, getDataForType]);

  // Filter data by selected item
  const filteredData = React.useMemo(() => {
    if (!isFilterableType || selectedActivity === "all") {
      return data;
    }
    return data.filter((item: any) => item[filterKey] === selectedActivity);
  }, [data, selectedActivity, isFilterableType, filterKey]);

  // Short name formatter for timeseries object IDs (e.g., "Model.Model.Arrivals" → "Arrivals")
  const shortNameFormatter = React.useMemo(() => {
    const objectIds = Array.from(new Set(data.map((item: any) => item.object_id).filter(Boolean)));
    return buildShortNameFormatter(objectIds as string[]);
  }, [data]);

  // Comparison table data (merged across scenarios)
  const comparisonTableData = React.useMemo(() => {
    if (!isComparing) return null;

    const rawDataMap = getDataForType(dataType);
    const dataMap = isFilterableType ? filterDataMap(rawDataMap) : rawDataMap;
    const baseColumns = getColumnsForDataType(dataType);

    const nameKey =
      dataType === "activity" ? "activity_name"
        : dataType === "entity" ? "entity_name"
        : dataType === "resource" ? "resource_name"
        : dataType === "activity-entity" ? "activity_name"
        : dataType === "state-summary" ? "state_name"
        : dataType === "scenario" ? "scenario_name"
        : "object_id";

    return {
      columns: mergeTableColumns(selectedScenarios, baseColumns, nameKey),
      data: mergeTableData(selectedScenarios, dataMap, nameKey),
    };
  }, [isComparing, dataType, selectedScenarios, getDataForType, isFilterableType, filterDataMap]);

  // Reset selected activity, metric, and expanded activity when data type changes
  useEffect(() => {
    setSelectedActivity("all");
    setSelectedObjects(new Set());
    // Set default metric for the new data type
    const options = metricOptions[dataType];
    if (options && options.length > 0) {
      setSelectedMetric(options[0].value);
    }
  }, [dataType]);

  // Render chart based on data type (detailed view)
  const renderChart = () => {
    const isTimeseriesType =
      dataType === "activity-contents-timeseries" ||
      dataType === "activity-inbound-queue-timeseries" ||
      dataType === "activity-outbound-queue-timeseries" ||
      dataType === "state-values-timeseries" ||
      dataType === "entity-throughput-timeseries";

    // Timeseries chart - sparkline grid with multi-select overlay
    if (isTimeseriesType) {
      // Build overlay chart when 1+ items are selected
      let overlayChart: React.ReactNode = null;

      if (selectedObjects.size > 0) {
        const selectedIds = Array.from(selectedObjects);
        const pivoted = pivotTimeseriesByObject(
          filteredData, selectedIds, "period_start_clock", "mean", "object_id"
        );
        overlayChart = (
          <div className="border border-gray-200 rounded bg-white p-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-xs font-semibold text-gray-700">
                {selectedIds.length === 1 ? shortNameFormatter(selectedIds[0]) : `Comparing ${selectedIds.length} items`}
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
            <TimeseriesChart
              data={pivoted.data}
              xKey="period_start_clock"
              yKeys={pivoted.yKeys}
              colors={pivoted.colors}
              height={200}
              nameFormatter={shortNameFormatter}
            />
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {overlayChart}
          <ChartContainer
            data={filteredData}
            loading={loading}
            error={error}
            emptyMessage={`No ${dataType} data available for this run`}
          >
            <SparklineGrid
              data={filteredData}
              groupByKey="object_id"
              xKey="period_start_clock"
              yKey="mean"
              selectedItems={selectedObjects}
              onItemSelect={toggleObjectSelection}
              labelFormatter={shortNameFormatter}
              sparklineHeight={50}
            />
          </ChartContainer>
        </div>
      );
    }

    // Bar chart for summary types with selectable metric
    if (metricOptions[dataType]) {
      const nameKey =
        dataType === "activity"
          ? "activity_name"
          : dataType === "entity"
          ? "entity_name"
          : dataType === "resource"
          ? "resource_name"
          : dataType === "activity-entity"
          ? "activity_name"
          : dataType === "state-summary"
          ? "state_name"
          : "scenario_name";

      return (
        <ChartContainer
          data={filteredData}
          loading={loading}
          error={error}
          emptyMessage={`No ${dataType} data available for this run`}
        >
          <ComparisonBarChart
            data={filteredData}
            xKey={nameKey}
            yKeys={[selectedMetric]}
            height={300}
            layout="vertical"
            valueFormatter={getPercentFormatter(selectedMetric)}
          />
        </ChartContainer>
      );
    }

    return null;
  };

  // Render comparison chart (multi-scenario overlay)
  const renderComparisonChart = () => {
    const rawDataMap = getDataForType(dataType);
    const dataMap = isFilterableType ? filterDataMap(rawDataMap) : rawDataMap;

    const isTimeseriesType =
      dataType === "activity-contents-timeseries" ||
      dataType === "activity-inbound-queue-timeseries" ||
      dataType === "activity-outbound-queue-timeseries" ||
      dataType === "state-values-timeseries" ||
      dataType === "entity-throughput-timeseries";

    if (isTimeseriesType) {
      const merged = mergeTimeseriesData(selectedScenarios, dataMap, "object_id", "period_start_clock", "mean");

      // Build short name formatter from comparison data object IDs
      const comparisonObjectIds = Array.from(new Set(merged.data.map((d: any) => d.object_id).filter(Boolean))) as string[];
      const comparisonNameFormatter = buildShortNameFormatter(comparisonObjectIds);

      // Build overlay chart when items are selected
      let overlayChart: React.ReactNode = null;

      if (selectedObjects.size > 0) {
        const selectedIds = Array.from(selectedObjects);
        // Pivot: for each time point, create columns like "ShortName (ScenarioName)"
        const overlayYKeys: string[] = [];
        const overlayColors: string[] = [];
        for (let oi = 0; oi < selectedIds.length; oi++) {
          const shortName = comparisonNameFormatter(selectedIds[oi]);
          for (let si = 0; si < selectedScenarios.length; si++) {
            const label = `${shortName} (${selectedScenarios[si].name})`;
            overlayYKeys.push(label);
            overlayColors.push(selectedScenarios[si].color);
          }
        }

        const filteredMerged = merged.data.filter((d: any) => selectedObjects.has(d.object_id));
        const timeMap = new Map<number | string, Record<string, any>>();
        for (const row of filteredMerged) {
          const xVal = row["period_start_clock"];
          if (!timeMap.has(xVal)) {
            const newRow: Record<string, any> = { period_start_clock: xVal };
            for (const k of overlayYKeys) newRow[k] = null;
            timeMap.set(xVal, newRow);
          }
          const target = timeMap.get(xVal)!;
          const shortName = comparisonNameFormatter(row.object_id);
          for (const s of selectedScenarios) {
            const srcKey = `mean_${s.name}`;
            const destKey = `${shortName} (${s.name})`;
            target[destKey] = row[srcKey];
          }
        }
        const overlayData = Array.from(timeMap.values()).sort((a, b) =>
          (a.period_start_clock as number) - (b.period_start_clock as number)
        );

        const headerLabel = selectedIds.length === 1
          ? comparisonNameFormatter(selectedIds[0])
          : `Comparing ${selectedIds.length} items`;

        overlayChart = (
          <div className="border border-gray-200 rounded bg-white p-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-xs font-semibold text-gray-700">
                {headerLabel} across {selectedScenarios.length} scenarios
              </span>
              <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                Clear
              </button>
            </div>
            <TimeseriesChart
              data={overlayData}
              xKey="period_start_clock"
              yKeys={overlayYKeys}
              colors={overlayColors}
              height={200}
            />
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {overlayChart}
          <ChartContainer data={merged.data} loading={comparisonLoading} error={null} emptyMessage={`No ${dataType} data available`}>
            <SparklineGrid
              data={merged.data}
              groupByKey="object_id"
              xKey="period_start_clock"
              yKeys={merged.yKeys}
              colors={merged.colors}
              selectedItems={selectedObjects}
              onItemSelect={toggleObjectSelection}
              labelFormatter={comparisonNameFormatter}
              sparklineHeight={50}
            />
          </ChartContainer>
        </div>
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
        <ChartContainer data={merged.data} loading={comparisonLoading} error={null} emptyMessage={`No ${dataType} data available`}>
          <ComparisonBarChart data={merged.data} xKey={nameKey} yKeys={merged.yKeys} colors={merged.colors} height={300} layout="vertical" valueFormatter={getPercentFormatter(selectedMetric)} />
        </ChartContainer>
      );
    }

    return null;
  };

  // Render Summary View (compact)
  const renderSummaryView = () => {
    const { scenario, activities, resources } = summaryData;

    if (summaryLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-xs text-gray-500">Loading summary...</div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Header Info */}
        <div className="bg-gray-50 rounded p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-gray-600">Scenario Name</span>
            <span className="text-gray-800 truncate ml-2">
              {scenario?.scenario_name || scenarioId}
            </span>
          </div>
        </div>

        {/* System Performance */}
        <div className="border border-gray-200 rounded">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase">
              System Performance
            </h4>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Total Throughput</span>
              <span className="font-medium">
                {formatNumber(scenario?.total_throughput_mean, 0)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Total Cost</span>
              <span className="font-medium">
                {formatNumber(scenario?.total_cost_mean, 2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Avg Cycle Time</span>
              <span className="font-medium">
                {formatNumber(scenario?.avg_cycle_time_mean, 2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Avg Time in System</span>
              <span className="font-medium">
                {formatNumber(scenario?.avg_time_in_system_mean, 2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Avg # in System</span>
              <span className="font-medium">
                {formatNumber(scenario?.avg_entities_in_system_mean, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* Activities Summary */}
        <div className="border border-gray-200 rounded">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase">
              Activities Summary
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600">
                    Name
                  </th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-600">
                    Util
                  </th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-600">
                    Cycle
                  </th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-600">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-3 text-center text-gray-500"
                    >
                      No activities
                    </td>
                  </tr>
                ) : (
                  activities.map((activity, idx) => (
                    <tr
                      key={activity.activity_id || idx}
                      className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() =>
                        handleDrillDown("activity", activity.activity_name)
                      }
                      title="Click to view details"
                    >
                      <td
                        className="px-2 py-1.5 truncate max-w-[100px] text-blue-600 hover:text-blue-800"
                        title={activity.activity_name}
                      >
                        {activity.activity_name}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatPercent(activity.capacity_utilization_mean)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatNumber(activity.cycle_time_mean, 1)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatNumber(activity.total_cost_mean, 2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resources Summary */}
        <div className="border border-gray-200 rounded">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase">
              Resource Summary
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600">
                    Name
                  </th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-600">
                    Util
                  </th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-600">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {resources.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-2 py-3 text-center text-gray-500"
                    >
                      No resources
                    </td>
                  </tr>
                ) : (
                  resources.map((resource, idx) => (
                    <tr
                      key={resource.resource_id || idx}
                      className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() =>
                        handleDrillDown("resource", resource.resource_name)
                      }
                      title="Click to view details"
                    >
                      <td
                        className="px-2 py-1.5 truncate max-w-[120px] text-blue-600 hover:text-blue-800"
                        title={resource.resource_name}
                      >
                        {resource.resource_name}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatPercent(resource.capacity_utilization_mean)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatNumber(resource.total_cost_mean, 2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render Comparison Summary View (multi-scenario)
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
            <h4 className="text-xs font-semibold text-gray-700 uppercase">System Performance</h4>
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
                        <span className="truncate max-w-[100px] inline-block align-bottom" title={s.name}>{s.name}</span>
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
                  {[
                    { key: "capacity_utilization_mean", label: "Util", format: formatPercent },
                    { key: "cycle_time_mean", label: "Cycle", format: (v: number | null | undefined) => formatNumber(v, 1) },
                  ].map((metric, mIdx) =>
                    selectedScenarios.map((s) => (
                      <th
                        key={`${metric.key}_${s.id}`}
                        className={`text-right px-2 py-1.5 font-medium text-gray-600${mIdx > 0 && s === selectedScenarios[0] ? " border-l-2 border-gray-300" : ""}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                          <span className="truncate max-w-[100px] inline-block align-bottom" title={s.name}>
                            {metric.label} ({s.name})
                          </span>
                        </span>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const activityMetrics = [
                    { key: "capacity_utilization_mean", format: formatPercent },
                    { key: "cycle_time_mean", format: (v: number | null | undefined) => formatNumber(v, 1) },
                  ];
                  const merged = mergeTableData(selectedScenarios, activityDataMap, "activity_name");
                  if (merged.length === 0) {
                    return (
                      <tr><td colSpan={1 + selectedScenarios.length * 2} className="px-2 py-3 text-center text-gray-500">No activities</td></tr>
                    );
                  }
                  return merged.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => handleDrillDown("activity", row.activity_name)}
                      title="Click to view details"
                    >
                      <td className="px-2 py-1.5 text-blue-600 truncate max-w-[100px]">{row.activity_name}</td>
                      {activityMetrics.map((metric, mIdx) =>
                        selectedScenarios.map((s) => (
                          <td
                            key={`${metric.key}_${s.id}`}
                            className={`px-2 py-1.5 text-right${mIdx > 0 && s === selectedScenarios[0] ? " border-l-2 border-gray-300" : ""}`}
                          >
                            {metric.format(row[`${metric.key}_${s.name}`])}
                          </td>
                        ))
                      )}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resources Comparison */}
        <div className="border border-gray-200 rounded">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase">Resource Summary</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600">Resource</th>
                  {[
                    { key: "capacity_utilization_mean", label: "Util", format: formatPercent },
                    { key: "total_cost_mean", label: "Cost", format: (v: number | null | undefined) => formatNumber(v, 2) },
                  ].map((metric, mIdx) =>
                    selectedScenarios.map((s) => (
                      <th
                        key={`${metric.key}_${s.id}`}
                        className={`text-right px-2 py-1.5 font-medium text-gray-600${mIdx > 0 && s === selectedScenarios[0] ? " border-l-2 border-gray-300" : ""}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                          <span className="truncate max-w-[100px] inline-block align-bottom" title={s.name}>
                            {metric.label} ({s.name})
                          </span>
                        </span>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const resourceMetrics = [
                    { key: "capacity_utilization_mean", format: formatPercent },
                    { key: "total_cost_mean", format: (v: number | null | undefined) => formatNumber(v, 2) },
                  ];
                  const merged = mergeTableData(selectedScenarios, resourceDataMap, "resource_name");
                  if (merged.length === 0) {
                    return (
                      <tr><td colSpan={1 + selectedScenarios.length * 2} className="px-2 py-3 text-center text-gray-500">No resources</td></tr>
                    );
                  }
                  return merged.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => handleDrillDown("resource", row.resource_name)}
                      title="Click to view details"
                    >
                      <td className="px-2 py-1.5 text-blue-600 truncate max-w-[120px]">{row.resource_name}</td>
                      {resourceMetrics.map((metric, mIdx) =>
                        selectedScenarios.map((s) => (
                          <td
                            key={`${metric.key}_${s.id}`}
                            className={`px-2 py-1.5 text-right${mIdx > 0 && s === selectedScenarios[0] ? " border-l-2 border-gray-300" : ""}`}
                          >
                            {metric.format(row[`${metric.key}_${s.name}`])}
                          </td>
                        ))
                      )}
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

  // Get filter label based on data type
  const getFilterLabel = () => {
    if (dataType === "activity") return "Activities";
    if (dataType === "entity") return "Entities";
    if (dataType === "resource") return "Resources";
    if (dataType === "activity-entity") return "Activities";
    return "Items";
  };

  // Render Detailed View (existing functionality)
  const renderDetailedView = () => {
    return (
      <>
        {/* Consolidated Controls Row */}
        <div className="flex gap-2 items-center flex-wrap">
          {/* Data Type Selector with optgroups */}
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value as CrossRepDataType)}
            className="px-2 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <optgroup label="Summaries">
              <option value="scenario">Scenario</option>
              <option value="activity">Activity</option>
              <option value="entity">Entity</option>
              <option value="resource">Resource</option>
              <option value="activity-entity">Activity Entity</option>
              <option value="state-summary">State</option>
            </optgroup>
            <optgroup label="Timeseries">
              <option value="activity-contents-timeseries">
                Activity Contents
              </option>
              <option value="activity-inbound-queue-timeseries">
                Inbound Queue
              </option>
              <option value="activity-outbound-queue-timeseries">
                Outbound Queue
              </option>
              <option value="state-values-timeseries">State Values</option>
              <option value="entity-throughput-timeseries">Entity Throughput</option>
            </optgroup>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded">
            <button
              onClick={() => setViewMode("table")}
              className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors rounded-l ${
                viewMode === "table"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Table view"
            >
              <Table2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode("chart")}
              className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === "chart"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Chart view"
            >
              <BarChart3 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode("both")}
              className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors rounded-r ${
                viewMode === "both"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Both table and chart"
            >
              <LayoutGrid className="w-3 h-3" />
            </button>
          </div>

          {/* Metric selector (only for chart view with bar charts) */}
          {(viewMode === "chart" || viewMode === "both") &&
            metricOptions[dataType] && (
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="px-2 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {metricOptions[dataType].map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

          {/* Filter dropdown (for filterable types) */}
          {isFilterableType && uniqueFilterItems.length > 1 && (
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="px-2 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All {getFilterLabel()}</option>
              {uniqueFilterItems.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}

          {/* Active filter indicator chip */}
          {selectedActivity !== "all" && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
              <span className="truncate max-w-[100px]" title={selectedActivity}>
                {selectedActivity}
              </span>
              <button
                onClick={() => setSelectedActivity("all")}
                className="hover:text-blue-900 ml-0.5"
                title="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Chart View */}
        {(viewMode === "chart" || viewMode === "both") && (
          <div className="space-y-2">{isComparing ? renderComparisonChart() : renderChart()}</div>
        )}

        {/* Data Table */}
        {(viewMode === "table" || viewMode === "both") && (
          <DataTable
            data={isComparing ? (comparisonTableData?.data || []) : filteredData}
            columns={isComparing ? (comparisonTableData?.columns || columns) : columns}
            loading={isComparing ? comparisonLoading : loading}
            error={isComparing ? null : error}
            emptyMessage={`No ${dataType} data available for this run`}
          />
        )}
      </>
    );
  };

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        {onBackToList && (
          <button
            onClick={onBackToList}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Back to run list"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
        )}
        <div className="flex items-center gap-1">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-semibold text-gray-800">Analysis</h2>
        </div>
        {downloadInfo && (
          <button
            onClick={handleCopyZipLink}
            title={zipCopied ? "Copied!" : "Copy ZIP URL"}
            className={`ml-auto flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
              zipCopied
                ? "bg-green-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {zipCopied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            {zipCopied ? "Copied" : "ZIP"}
          </button>
        )}
      </div>

      {/* Summary/Detailed Toggle */}
      <div className="flex gap-1 border border-gray-300 rounded w-fit">
        <button
          onClick={() => setViewType("summary")}
          className={`px-3 py-1 text-xs font-medium flex items-center gap-1 transition-colors rounded-l ${
            viewType === "summary"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <List className="w-3 h-3" />
          Summary
        </button>
        <button
          onClick={() => setViewType("detailed")}
          className={`px-3 py-1 text-xs font-medium flex items-center gap-1 transition-colors rounded-r ${
            viewType === "detailed"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Table2 className="w-3 h-3" />
          Detailed
        </button>
      </div>

      {/* Scenario Picker */}
      {!availableScenariosLoading && availableScenarios.length > 1 && (
        <ScenarioPicker
          selectedScenarios={selectedScenarios}
          availableScenarios={availableScenarios}
          onAdd={addScenario}
          onRemove={removeScenario}
        />
      )}

      {/* Content based on view type */}
      {viewType === "summary"
        ? (isComparing ? renderComparisonSummaryView() : renderSummaryView())
        : renderDetailedView()}
    </div>
  );
};

export default SimulationRunAnalysisDashboard;
