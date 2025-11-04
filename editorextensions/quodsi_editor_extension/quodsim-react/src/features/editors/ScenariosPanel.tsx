import React, { useState } from "react";
import ScenarioEditor from "./ScenarioEditor";
import ScenarioAnalysisDashboard from "./ScenarioAnalysisDashboard";

type ScenarioSubTab = "list" | "analysis";

interface ScenariosPanelProps {
  documentId?: string;
}

const ScenariosPanel: React.FC<ScenariosPanelProps> = ({ documentId }) => {
  const [activeSubTab, setActiveSubTab] = useState<ScenarioSubTab>("list");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const handleAnalyzeScenario = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
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
          disabled={!selectedScenarioId}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            activeSubTab === "analysis"
              ? "bg-blue-600 text-white"
              : selectedScenarioId
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
          <ScenarioEditor
            documentId={documentId}
            onAnalyze={handleAnalyzeScenario}
          />
        )}
        {activeSubTab === "analysis" && selectedScenarioId && (
          <ScenarioAnalysisDashboard
            scenarioId={selectedScenarioId}
            onBackToList={handleBackToList}
          />
        )}
      </div>
    </div>
  );
};

export default ScenariosPanel;
