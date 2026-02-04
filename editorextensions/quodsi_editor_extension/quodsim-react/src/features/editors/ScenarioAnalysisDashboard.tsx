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
import { EnvelopeMessageType, ScenarioDownloadInfo } from "@quodsi/shared";
import { useScenarioSender } from "../../messaging/senders/scenarioSender";
import DataTable from "../../components/DataTable";
import {
  ChartContainer,
  TimeseriesChart,
  ComparisonBarChart,
  SparklineGrid,
  ExpandedTimeseriesChart,
} from "../../components/charts";
import {
  CrossRepDataType,
  getColumnsForDataType,
} from "./crossRepTableConfigs";

interface ScenarioAnalysisDashboardProps {
  scenarioId: string;
  documentId: string;
  onBackToList: () => void;
  downloadInfo?: ScenarioDownloadInfo;
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

// Metric options for chart by data type
const metricOptions: Record<string, { value: string; label: string }[]> = {
  activity: [
    { value: "utilization_mean", label: "Utilization (Mean)" },
    { value: "utilization_max", label: "Utilization (Max)" },
    { value: "utilization_std_dev", label: "Utilization (Std Dev)" },
    { value: "cycle_time_mean", label: "Cycle Time (Mean)" },
    { value: "cycle_time_median", label: "Cycle Time (Median)" },
    {
      value: "total_time_waiting_for_resource_mean",
      label: "Time Waiting for Resource",
    },
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
    { value: "time_waiting_mean", label: "Time Waiting" },
    { value: "time_in_operation_mean", label: "Time in Operation" },
    { value: "percent_waiting_mean", label: "% Waiting" },
    { value: "percent_operation_mean", label: "% In Operation" },
    { value: "percent_blocked_mean", label: "% Blocked" },
    { value: "trough_wip_mean", label: "Trough WIP" },
    { value: "peak_wip_mean", label: "Peak WIP" },
  ],
  resource: [
    { value: "utilization_mean", label: "Utilization (Mean)" },
    { value: "utilization_min", label: "Utilization (Min)" },
    { value: "utilization_max", label: "Utilization (Max)" },
    { value: "utilization_std_dev", label: "Utilization (Std Dev)" },
    { value: "bottleneck_frequency", label: "Bottleneck Frequency" },
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

const ScenarioAnalysisDashboard: React.FC<ScenarioAnalysisDashboardProps> = ({
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
  const [viewMode, setViewMode] = useState<"table" | "chart" | "both">("table");
  const [zipCopied, setZipCopied] = useState<boolean>(false);
  const [selectedMetric, setSelectedMetric] =
    useState<string>("utilization_mean");

  // Expanded activity for timeseries small multiples view
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  // Hooks
  const { getCrossRepData } = useScenarioSender();

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
        console.log("[ScenarioAnalysisDashboard] ZIP link copied to clipboard");
        setZipCopied(true);
        setTimeout(() => setZipCopied(false), 2000);
      } else {
        console.error("[ScenarioAnalysisDashboard] execCommand copy failed");
      }
    } catch (error) {
      console.error(
        "[ScenarioAnalysisDashboard] Failed to copy ZIP link:",
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

    console.log("[ScenarioAnalysisDashboard] Fetching summary data...");
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
      `[ScenarioAnalysisDashboard] Fetching ${dataType} data for scenario ${scenarioId}`
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

  // Listen for data responses
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === EnvelopeMessageType.CROSS_REP_DATA_RESULT) {
        console.log(
          "[ScenarioAnalysisDashboard] Received cross-rep data:",
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
          console.error("[ScenarioAnalysisDashboard] Error:", message.data);
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

  // Get unique items for filtering based on data type
  const uniqueFilterItems = React.useMemo(() => {
    if (!isFilterableType || data.length === 0) return [];

    const isTimeseriesType =
      dataType === "activity-contents-timeseries" ||
      dataType === "activity-inbound-queue-timeseries" ||
      dataType === "activity-outbound-queue-timeseries" ||
      dataType === "state-values-timeseries" ||
      dataType === "entity-throughput-timeseries";

    let key = "object_id"; // Default for timeseries
    if (dataType === "activity") key = "activity_name";
    else if (dataType === "entity") key = "entity_name";
    else if (dataType === "resource") key = "resource_name";
    else if (dataType === "activity-entity") key = "activity_name";

    const items = Array.from(new Set(data.map((item: any) => item[key])))
      .filter(Boolean)
      .sort();
    return items as string[];
  }, [data, dataType, isFilterableType]);

  // Filter data by selected item
  const filteredData = React.useMemo(() => {
    if (!isFilterableType || selectedActivity === "all") {
      return data;
    }

    const isTimeseriesType =
      dataType === "activity-contents-timeseries" ||
      dataType === "activity-inbound-queue-timeseries" ||
      dataType === "activity-outbound-queue-timeseries" ||
      dataType === "state-values-timeseries" ||
      dataType === "entity-throughput-timeseries";

    let key = "object_id"; // Default for timeseries
    if (dataType === "activity") key = "activity_name";
    else if (dataType === "entity") key = "entity_name";
    else if (dataType === "resource") key = "resource_name";
    else if (dataType === "activity-entity") key = "activity_name";

    return data.filter((item: any) => item[key] === selectedActivity);
  }, [data, dataType, selectedActivity, isFilterableType]);

  // Reset selected activity, metric, and expanded activity when data type changes
  useEffect(() => {
    setSelectedActivity("all");
    setExpandedActivity(null);
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

    // Timeseries chart - use small multiples grid approach
    if (isTimeseriesType) {
      // If an activity is selected for expansion, show full chart
      if (expandedActivity) {
        const activityData = filteredData.filter(
          (d: any) => d.object_id === expandedActivity
        );
        return (
          <ChartContainer
            data={activityData}
            loading={loading}
            error={error}
            emptyMessage={`No data available for ${expandedActivity}`}
          >
            <ExpandedTimeseriesChart
              data={activityData}
              objectId={expandedActivity}
              xKey="period_start_clock"
              yKeys={["mean", "min", "max"]}
              onClose={() => setExpandedActivity(null)}
              height={400}
            />
          </ChartContainer>
        );
      }

      // Default: show sparkline grid for all activities
      return (
        <ChartContainer
          data={filteredData}
          loading={loading}
          error={error}
          emptyMessage={`No ${dataType} data available for this scenario`}
        >
          <SparklineGrid
            data={filteredData}
            groupByKey="object_id"
            xKey="period_start_clock"
            yKey="mean"
            onItemClick={(id) => setExpandedActivity(id)}
            sparklineHeight={50}
          />
        </ChartContainer>
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
          emptyMessage={`No ${dataType} data available for this scenario`}
        >
          <ComparisonBarChart
            data={filteredData}
            xKey={nameKey}
            yKeys={[selectedMetric]}
            height={300}
            layout="vertical"
          />
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
                        {formatPercent(activity.utilization_mean)}
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
                        {formatPercent(resource.utilization_mean)}
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

  // Get filter label based on data type
  const getFilterLabel = () => {
    if (dataType === "activity") return "Activity";
    if (dataType === "entity") return "Entity";
    if (dataType === "resource") return "Resource";
    if (dataType === "activity-entity") return "Activity";
    return "Item";
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
              <option value="all">All {getFilterLabel()}s</option>
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
          <div className="space-y-2">{renderChart()}</div>
        )}

        {/* Data Table */}
        {(viewMode === "table" || viewMode === "both") && (
          <DataTable
            data={filteredData}
            columns={columns}
            loading={loading}
            error={error}
            emptyMessage={`No ${dataType} data available for this scenario`}
          />
        )}
      </>
    );
  };

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBackToList}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          title="Back to scenario list"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </button>
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

      {/* Content based on view type */}
      {viewType === "summary" ? renderSummaryView() : renderDetailedView()}
    </div>
  );
};

export default ScenarioAnalysisDashboard;
