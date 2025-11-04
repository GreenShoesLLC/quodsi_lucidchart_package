import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, BarChart3, Activity, Users, Wrench } from "lucide-react";
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

  // Data type button config
  const dataTypeButtons = [
    {
      type: "activity" as CrossRepDataType,
      label: "Activities",
      icon: Activity,
      color: "blue",
    },
    {
      type: "entity" as CrossRepDataType,
      label: "Entities",
      icon: Users,
      color: "green",
    },
    {
      type: "resource" as CrossRepDataType,
      label: "Resources",
      icon: Wrench,
      color: "orange",
    },
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
      <div className="flex gap-2">
        {dataTypeButtons.map((btn) => {
          const Icon = btn.icon;
          const isActive = dataType === btn.type;
          const colorClasses = isActive
            ? `bg-${btn.color}-600 text-white`
            : `bg-gray-100 text-gray-700 hover:bg-gray-200`;

          return (
            <button
              key={btn.type}
              onClick={() => setDataType(btn.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${colorClasses}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Data Table */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="p-3 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {dataType === "activity" && "Activity Cross-Replication Summary"}
            {dataType === "entity" && "Entity Cross-Replication Summary"}
            {dataType === "resource" && "Resource Cross-Replication Summary"}
          </h3>
        </div>
        <div className="p-3">
          <DataTable
            data={data}
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
