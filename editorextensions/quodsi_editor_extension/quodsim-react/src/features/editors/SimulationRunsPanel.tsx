import React, { useState } from "react";
import SimulationRunEditor from "./SimulationRunEditor";
import SimulationRunAnalysisDashboard from "./SimulationRunAnalysisDashboard";
import { useSimulationRuns } from "../../messaging/MessageProvider";
import { selectSimulationRuns, SimulationRun } from "../../messaging/state/simulationRunSlice";
import { SimulationRunDownloadInfo } from "@quodsi/shared";

type RunSubTab = "list" | "analysis";

interface SimulationRunsPanelProps {
  documentId?: string;
}

const SimulationRunsPanel: React.FC<SimulationRunsPanelProps> = ({ documentId }) => {
  const [activeSubTab, setActiveSubTab] = useState<RunSubTab>("list");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedDownloadInfo, setSelectedDownloadInfo] = useState<SimulationRunDownloadInfo | undefined>(undefined);

  // Get simulation runs from Redux state
  const simulationRunState = useSimulationRuns();
  const simulationRuns = selectSimulationRuns({ simulationRuns: simulationRunState });

  const handleAnalyzeRun = (runId: string) => {
    // Find the run to get its downloadInfo
    const simulationRun = simulationRuns.find((s: SimulationRun) => s.id === runId);
    setSelectedRunId(runId);
    setSelectedDownloadInfo(simulationRun?.downloadInfo);
    setActiveSubTab("analysis");
  };

  const handleBackToList = () => {
    setActiveSubTab("list");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab navigation */}
      <div className="flex gap-2 p-2 border-b bg-gray-50">
        <button
          onClick={() => setActiveSubTab("list")}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            activeSubTab === "list"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          List
        </button>
        <button
          onClick={() => setActiveSubTab("analysis")}
          disabled={!selectedRunId}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            activeSubTab === "analysis"
              ? "bg-blue-600 text-white"
              : selectedRunId
              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Analysis
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {activeSubTab === "list" && (
          <SimulationRunEditor
            documentId={documentId}
            onAnalyze={handleAnalyzeRun}
          />
        )}
        {activeSubTab === "analysis" && selectedRunId && documentId && (
          <SimulationRunAnalysisDashboard
            scenarioId={selectedRunId}
            documentId={documentId}
            onBackToList={handleBackToList}
            downloadInfo={selectedDownloadInfo}
          />
        )}
      </div>
    </div>
  );
};

export default SimulationRunsPanel;
