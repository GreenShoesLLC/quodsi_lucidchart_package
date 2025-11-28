import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, BarChart3, Table2, LayoutGrid, Download, Check, List } from "lucide-react";
import { EnvelopeMessageType, ScenarioDownloadInfo } from "@quodsi/shared";
import { useScenarioSender } from "../../messaging/senders/scenarioSender";
import DataTable from "../../components/DataTable";
import {
  ChartContainer,
  TimeseriesChart,
  ComparisonBarChart,
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
const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return value.toFixed(decimals);
};

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
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
  const summaryDataReceived = useRef({ scenario: false, activity: false, resource: false });

  // Detailed view state (existing)
  const [dataType, setDataType] = useState<CrossRepDataType>("activity");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "chart" | "both">("table");
  const [zipCopied, setZipCopied] = useState<boolean>(false);

  // Hooks
  const { getCrossRepData } = useScenarioSender();

  // Handle ZIP download link copy
  const handleCopyZipLink = () => {
    if (!downloadInfo?.zipUrl) return;

    try {
      const textarea = document.createElement('textarea');
      textarea.value = downloadInfo.zipUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        console.log('[ScenarioAnalysisDashboard] ZIP link copied to clipboard');
        setZipCopied(true);
        setTimeout(() => setZipCopied(false), 2000);
      } else {
        console.error('[ScenarioAnalysisDashboard] execCommand copy failed');
      }
    } catch (error) {
      console.error('[ScenarioAnalysisDashboard] Failed to copy ZIP link:', error);
    }
  };

  // Fetch summary data (all 3 types in parallel)
  const fetchSummaryData = useCallback(() => {
    if (!documentId || !scenarioId) return;

    console.log('[ScenarioAnalysisDashboard] Fetching summary data...');
    setSummaryLoading(true);
    summaryDataReceived.current = { scenario: false, activity: false, resource: false };

    // Fetch all 3 data types
    getCrossRepData(documentId, scenarioId, 'scenario');
    getCrossRepData(documentId, scenarioId, 'activity');
    getCrossRepData(documentId, scenarioId, 'resource');
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
    if (viewType === 'summary') {
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
        console.log("[ScenarioAnalysisDashboard] Received cross-rep data:", message.data);

        const { dataType: receivedType, success, data: receivedData } = message.data;

        // Handle summary view data
        if (viewType === 'summary') {
          if (success) {
            setSummaryData(prev => {
              const newData = { ...prev };
              if (receivedType === 'scenario') {
                newData.scenario = receivedData?.[0] || null;
                summaryDataReceived.current.scenario = true;
              } else if (receivedType === 'activity') {
                newData.activities = receivedData || [];
                summaryDataReceived.current.activity = true;
              } else if (receivedType === 'resource') {
                newData.resources = receivedData || [];
                summaryDataReceived.current.resource = true;
              }
              return newData;
            });

            // Check if all data received
            if (summaryDataReceived.current.scenario &&
                summaryDataReceived.current.activity &&
                summaryDataReceived.current.resource) {
              setSummaryLoading(false);
            }
          }
        }

        // Handle detailed view data
        if (viewType === 'detailed' && receivedType === dataType) {
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
        if (message.data?.relatedTo === EnvelopeMessageType.CROSS_REP_DATA_REQUEST) {
          console.error("[ScenarioAnalysisDashboard] Error:", message.data);
          if (viewType === 'detailed' && message.data?.dataType === dataType) {
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

  // Get unique activities for filtering (when timeseries is selected)
  const uniqueActivities = React.useMemo(() => {
    const isTimeseriesType = dataType === "activity-contents-timeseries" ||
                             dataType === "activity-input-buffer-timeseries" ||
                             dataType === "activity-output-buffer-timeseries" ||
                             dataType === "state-values-timeseries";
    if (isTimeseriesType && data.length > 0) {
      const activities = Array.from(
        new Set(data.map((item: any) => item.object_id))
      ).sort();
      return activities;
    }
    return [];
  }, [data, dataType]);

  // Filter data by selected activity (for timeseries only)
  const filteredData = React.useMemo(() => {
    const isTimeseriesType = dataType === "activity-contents-timeseries" ||
                             dataType === "activity-input-buffer-timeseries" ||
                             dataType === "activity-output-buffer-timeseries" ||
                             dataType === "state-values-timeseries";
    if (isTimeseriesType && selectedActivity !== "all") {
      return data.filter((item: any) => item.object_id === selectedActivity);
    }
    return data;
  }, [data, dataType, selectedActivity]);

  // Reset selected activity when data type changes
  useEffect(() => {
    setSelectedActivity("all");
  }, [dataType]);

  // Data type options for dropdown (detailed view)
  const dataTypeOptions = [
    { value: "scenario", label: "Scenario Summary" },
    { value: "activity", label: "Activity Summary" },
    { value: "entity", label: "Entity Summary" },
    { value: "resource", label: "Resource Summary" },
    { value: "activity-contents-timeseries", label: "Activity Contents Timeseries" },
    { value: "activity-input-buffer-timeseries", label: "Activity Input Buffer Timeseries" },
    { value: "activity-output-buffer-timeseries", label: "Activity Output Buffer Timeseries" },
    { value: "state-summary", label: "State Summary" },
    { value: "state-values-timeseries", label: "State Values Timeseries" },
  ];

  // Render chart based on data type (detailed view)
  const renderChart = () => {
    const isTimeseriesType =
      dataType === "activity-contents-timeseries" ||
      dataType === "activity-input-buffer-timeseries" ||
      dataType === "activity-output-buffer-timeseries" ||
      dataType === "state-values-timeseries";

    if (isTimeseriesType) {
      return (
        <ChartContainer
          data={filteredData}
          loading={loading}
          error={error}
          emptyMessage={`No ${dataType} data available for this scenario`}
        >
          <TimeseriesChart
            data={filteredData}
            xKey="period_start_clock"
            yKeys={["mean", "min", "max"]}
            xLabel="Time"
            yLabel="Value"
            height={350}
          />
        </ChartContainer>
      );
    } else if (dataType === "activity") {
      return (
        <ChartContainer
          data={filteredData}
          loading={loading}
          error={error}
          emptyMessage="No activity data available for this scenario"
        >
          <ComparisonBarChart
            data={filteredData}
            xKey="activity_name"
            yKeys={["utilization_mean", "cycle_time_mean", "queue_length_mean"]}
            yLabel="Value"
            height={350}
          />
        </ChartContainer>
      );
    } else if (dataType === "entity") {
      return (
        <ChartContainer
          data={filteredData}
          loading={loading}
          error={error}
          emptyMessage="No entity data available for this scenario"
        >
          <ComparisonBarChart
            data={filteredData}
            xKey="entity_name"
            yKeys={["throughput_rate_mean", "time_in_system_mean", "time_waiting_mean"]}
            yLabel="Value"
            height={350}
          />
        </ChartContainer>
      );
    } else if (dataType === "resource") {
      return (
        <ChartContainer
          data={filteredData}
          loading={loading}
          error={error}
          emptyMessage="No resource data available for this scenario"
        >
          <ComparisonBarChart
            data={filteredData}
            xKey="resource_name"
            yKeys={["utilization_mean", "utilization_min", "utilization_max"]}
            yLabel="Utilization"
            height={350}
          />
        </ChartContainer>
      );
    } else if (dataType === "state-summary") {
      return (
        <ChartContainer
          data={filteredData}
          loading={loading}
          error={error}
          emptyMessage="No state summary data available for this scenario"
        >
          <ComparisonBarChart
            data={filteredData}
            xKey="state_name"
            yKeys={["mean_final_value", "mean_min_value", "mean_max_value"]}
            yLabel="Value"
            height={350}
          />
        </ChartContainer>
      );
    } else if (dataType === "scenario") {
      return (
        <ChartContainer
          data={filteredData}
          loading={loading}
          error={error}
          emptyMessage="No scenario summary data available"
        >
          <ComparisonBarChart
            data={filteredData}
            xKey="scenario_name"
            yKeys={["total_throughput_mean", "total_entities_created_mean", "avg_cycle_time_mean"]}
            yLabel="Value"
            height={350}
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
            <span className="text-gray-800 truncate ml-2">{scenario?.scenario_name || scenarioId}</span>
          </div>
        </div>

        {/* System Performance */}
        <div className="border border-gray-200 rounded">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase">System Performance</h4>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Total Throughput</span>
              <span className="font-medium">{formatNumber(scenario?.total_throughput_mean, 0)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Total Cost</span>
              <span className="font-medium">{formatNumber(scenario?.total_cost_mean, 2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Avg Cycle Time</span>
              <span className="font-medium">{formatNumber(scenario?.avg_cycle_time_mean, 2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Avg Time in System</span>
              <span className="font-medium">{formatNumber(scenario?.avg_time_in_system_mean, 2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Avg # in System</span>
              <span className="font-medium">{formatNumber(scenario?.avg_entities_in_system_mean, 2)}</span>
            </div>
          </div>
        </div>

        {/* Activities Summary */}
        <div className="border border-gray-200 rounded">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase">Activities Summary</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600">Name</th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-600">Util</th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-600">Cycle</th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-600">Cost</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-3 text-center text-gray-500">No activities</td>
                  </tr>
                ) : (
                  activities.map((activity, idx) => (
                    <tr key={activity.activity_id || idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-1.5 truncate max-w-[100px]" title={activity.activity_name}>
                        {activity.activity_name}
                      </td>
                      <td className="px-2 py-1.5 text-right">{formatPercent(activity.utilization_mean)}</td>
                      <td className="px-2 py-1.5 text-right">{formatNumber(activity.cycle_time_mean, 1)}</td>
                      <td className="px-2 py-1.5 text-right text-gray-400">-</td>
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
            <h4 className="text-xs font-semibold text-gray-700 uppercase">Resource Summary</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600">Name</th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-600">Util</th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-600">Cost</th>
                </tr>
              </thead>
              <tbody>
                {resources.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-3 text-center text-gray-500">No resources</td>
                  </tr>
                ) : (
                  resources.map((resource, idx) => (
                    <tr key={resource.resource_id || idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-1.5 truncate max-w-[120px]" title={resource.resource_name}>
                        {resource.resource_name}
                      </td>
                      <td className="px-2 py-1.5 text-right">{formatPercent(resource.utilization_mean)}</td>
                      <td className="px-2 py-1.5 text-right text-gray-400">-</td>
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

  // Render Detailed View (existing functionality)
  const renderDetailedView = () => {
    return (
      <>
        {/* Controls Row */}
        <div className="flex gap-3 items-center flex-wrap">
          {/* Data Type Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700">
              Data Type:
            </label>
            <select
              value={dataType}
              onChange={(e) => setDataType(e.target.value as CrossRepDataType)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dataTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 ml-4">
            <label className="text-xs font-medium text-gray-700">View:</label>
            <div className="flex gap-1 border border-gray-300 rounded">
              <button
                onClick={() => setViewMode("table")}
                className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewMode === "table"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                title="Table view"
              >
                <Table2 className="w-3 h-3" />
                Table
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
                Chart
              </button>
              <button
                onClick={() => setViewMode("both")}
                className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewMode === "both"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                title="Both table and chart"
              >
                <LayoutGrid className="w-3 h-3" />
                Both
              </button>
            </div>
          </div>

          {/* Activity Filter (only for timeseries) */}
          {(dataType === "activity-contents-timeseries" ||
            dataType === "activity-input-buffer-timeseries" ||
            dataType === "activity-output-buffer-timeseries" ||
            dataType === "state-values-timeseries") &&
            uniqueActivities.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-700">
                  Filter by Activity:
                </label>
                <select
                  value={selectedActivity}
                  onChange={(e) => setSelectedActivity(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Activities</option>
                  {uniqueActivities.map((activity) => (
                    <option key={activity} value={activity}>
                      {activity}
                    </option>
                  ))}
                </select>
              </div>
            )}
        </div>

        {/* Chart View */}
        {(viewMode === "chart" || viewMode === "both") && (
          <div className="space-y-2">
            {renderChart()}
          </div>
        )}

        {/* Data Table */}
        {(viewMode === "table" || viewMode === "both") && (
          <div className="border border-gray-200 rounded-lg bg-white">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {dataType === "scenario" && "Scenario Cross-Replication Summary"}
                {dataType === "activity" && "Activity Cross-Replication Summary"}
                {dataType === "entity" && "Entity Cross-Replication Summary"}
                {dataType === "resource" && "Resource Cross-Replication Summary"}
                {dataType === "activity-contents-timeseries" && "Activity Contents Timeseries"}
                {dataType === "activity-input-buffer-timeseries" && "Activity Input Buffer Timeseries"}
                {dataType === "activity-output-buffer-timeseries" && "Activity Output Buffer Timeseries"}
                {dataType === "state-summary" && "State Summary"}
                {dataType === "state-values-timeseries" && "State Values Timeseries"}
              </h3>
            </div>
            <div className="p-3">
              <DataTable
                data={filteredData}
                columns={columns}
                loading={loading}
                error={error}
                emptyMessage={`No ${dataType} data available for this scenario`}
              />
            </div>
          </div>
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
          <h2 className="text-xs font-semibold text-gray-800">
            Analysis
          </h2>
        </div>
        {downloadInfo && (
          <button
            onClick={handleCopyZipLink}
            title={zipCopied ? "Copied!" : "Copy ZIP URL"}
            className={`ml-auto flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
              zipCopied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {zipCopied ? <Check className="w-3 h-3" /> : <Download className="w-3 h-3" />}
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
