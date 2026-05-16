import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  BarChart3,
  Table2,
  Download,
  Check,
  List,
} from "lucide-react";
import { SimulationRunDownloadInfo } from "@quodsi/shared";
import { useSimulationRunSender } from "../../../messaging/senders/simulationRunSender";
import { useAnalyticsSender } from "../../../messaging/senders/analyticsSender";
import { CrossRepDataType } from "./crossRepTableConfigs";
import ScenarioPicker from "../../../components/ScenarioPicker";
import { useComparisonData } from "../../../hooks/useComparisonData";
import { useCrossRepData } from "../../../hooks/useCrossRepData";
import SummaryView from "./SummaryView";
import ComparisonSummaryView from "./ComparisonSummaryView";
import DetailedView from "./DetailedView";

interface SimulationRunAnalysisDashboardProps {
  scenarioId: string;
  documentId: string;
  onBackToList?: () => void;
  downloadInfo?: SimulationRunDownloadInfo;
  onRerunScenario?: (scenarioId: string) => void;
}

const SimulationRunAnalysisDashboard: React.FC<SimulationRunAnalysisDashboardProps> = ({
  scenarioId,
  documentId,
  onBackToList,
  downloadInfo,
  onRerunScenario,
}) => {
  // View type: summary (compact) or detailed (existing tables/charts)
  const [viewType, setViewType] = useState<"summary" | "detailed">("summary");

  // Detailed view state (owned here because comparison fetch effect depends on dataType)
  const [dataType, setDataType] = useState<CrossRepDataType>("activity");
  const [zipCopied, setZipCopied] = useState<boolean>(false);
  const [initialFilter, setInitialFilter] = useState<string | undefined>();

  // Hooks
  const { getCrossRepData, getCrossRepBatchData } = useSimulationRunSender();
  const { track } = useAnalyticsSender();

  // Fire analytics on mount — backend deduplicates first_results_viewed via user flag.
  useEffect(() => {
    if (!scenarioId) return;
    track('first_results_viewed', { run_id: scenarioId });
    track('results_viewed', { run_id: scenarioId });
  }, [scenarioId, track]);

  const {
    data,
    loading,
    error,
    summaryData,
    summaryLoading,
    fetchSummaryData,
    fetchDetailedData,
  } = useCrossRepData({
    documentId,
    scenarioId,
    viewType,
    dataType,
    getCrossRepData,
    getCrossRepBatchData,
  });

  const {
    selectedScenarios,
    availableScenarios,
    addScenario,
    removeScenario,
    getDataForType,
    isLoading: comparisonLoading,
    fetchDataType,
    fetchDataTypes,
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
    setInitialFilter(filterValue);
    setViewType("detailed");
  };

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
        fetchDataTypes(["scenario", "activity", "resource"]);
      } else {
        fetchDataTypes([dataType]);
      }
    }
  }, [isComparing, viewType, dataType, selectedScenarios.map(s => s.id).join(","), fetchDataTypes]);

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
        ? (isComparing ? (
          <ComparisonSummaryView
            selectedScenarios={selectedScenarios}
            getDataForType={getDataForType}
            comparisonLoading={comparisonLoading}
            onDrillDown={handleDrillDown}
            onRerunScenario={onRerunScenario}
          />
        ) : (
          <SummaryView
            summaryData={summaryData}
            summaryLoading={summaryLoading}
            scenarioId={scenarioId}
            onDrillDown={handleDrillDown}
            selectedScenarios={selectedScenarios}
            onRerunScenario={onRerunScenario}
            scenarioMetaLoading={availableScenariosLoading}
          />
        ))
        : (
          <DetailedView
            data={data}
            loading={loading}
            error={error}
            isComparing={isComparing}
            selectedScenarios={selectedScenarios}
            getDataForType={getDataForType}
            comparisonLoading={comparisonLoading}
            dataType={dataType}
            onDataTypeChange={setDataType}
            initialFilter={initialFilter}
            onRerunScenario={onRerunScenario}
          />
        )}
    </div>
  );
};

export default SimulationRunAnalysisDashboard;
