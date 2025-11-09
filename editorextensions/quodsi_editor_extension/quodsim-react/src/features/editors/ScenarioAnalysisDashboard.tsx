import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { EnvelopeMessageType } from "@quodsi/shared";
import { useScenarioSender } from "../../messaging/senders/scenarioSender";
import DataTable from "../../components/DataTable";
import {
  CrossRepDataType,
  getColumnsForDataType,
} from "./crossRepTableConfigs";

interface ScenarioAnalysisDashboardProps {
  scenarioId: string;
  documentId: string;
  onBackToList: () => void;
}

const ScenarioAnalysisDashboard: React.FC<ScenarioAnalysisDashboardProps> = ({
  scenarioId,
  documentId,
  onBackToList,
}) => {
  // State
  const [dataType, setDataType] = useState<CrossRepDataType>("activity");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>("all");

  // Hooks
  const { getCrossRepData } = useScenarioSender();

  // Fetch data when dataType changes
  const fetchData = useCallback(() => {
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

  // Fetch data when component mounts or dataType changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for data responses
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      // Handle successful data response
      if (message.type === EnvelopeMessageType.CROSS_REP_DATA_RESULT) {
        console.log(
          "[ScenarioAnalysisDashboard] Received cross-rep data:",
          message.data
        );

        // Only update if this is the data type we're currently viewing
        if (message.data.dataType === dataType) {
          if (message.data.success) {
            setData(message.data.data || []);
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
          message.data?.relatedTo ===
            EnvelopeMessageType.CROSS_REP_DATA_REQUEST &&
          message.data?.dataType === dataType
        ) {
          console.error("[ScenarioAnalysisDashboard] Error:", message.data);
          setError(message.data.message || "An error occurred");
          setLoading(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [dataType]);

  // Get columns for current data type
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

  // Data type options for dropdown
  const dataTypeOptions = [
    { value: "activity", label: "Activity Summary" },
    { value: "entity", label: "Entity Summary" },
    { value: "resource", label: "Resource Summary" },
    { value: "activity-contents-timeseries", label: "Activity Contents Timeseries" },
    { value: "activity-input-buffer-timeseries", label: "Activity Input Buffer Timeseries" },
    { value: "activity-output-buffer-timeseries", label: "Activity Output Buffer Timeseries" },
    { value: "state-summary", label: "State Summary" },
    { value: "state-values-timeseries", label: "State Values Timeseries" },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBackToList}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          title="Back to scenario list"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-800">
            Analysis Dashboard
          </h2>
        </div>
        <div className="ml-auto">
          <p className="text-xs text-gray-500">
            Scenario: <span className="font-mono">{scenarioId}</span>
          </p>
        </div>
      </div>

      {/* Data Type Selector */}
      <div className="flex gap-3 items-center">
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

      {/* Data Table */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="p-3 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
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
    </div>
  );
};

export default ScenarioAnalysisDashboard;
