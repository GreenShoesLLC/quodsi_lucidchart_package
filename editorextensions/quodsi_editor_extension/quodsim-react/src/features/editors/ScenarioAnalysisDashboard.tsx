import React from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";

interface ScenarioAnalysisDashboardProps {
  scenarioId: string;
  onBackToList: () => void;
}

const ScenarioAnalysisDashboard: React.FC<ScenarioAnalysisDashboardProps> = ({
  scenarioId,
  onBackToList,
}) => {
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
      </div>

      {/* Placeholder content */}
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              Analysis Dashboard (Coming Soon)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Scenario ID: <span className="font-mono">{scenarioId}</span>
            </p>
          </div>
          <div className="text-xs text-gray-600 max-w-sm mx-auto">
            This dashboard will display activity utilization metrics, resource
            statistics, entity flow analysis, and interactive charts for scenario
            results.
          </div>
        </div>
      </div>

      {/* Future sections placeholder */}
      <div className="space-y-2">
        <div className="p-3 border border-dashed border-gray-300 rounded bg-white">
          <p className="text-xs font-medium text-gray-500">
            📊 Activity Metrics Section
          </p>
        </div>
        <div className="p-3 border border-dashed border-gray-300 rounded bg-white">
          <p className="text-xs font-medium text-gray-500">
            🔧 Resource Utilization Section
          </p>
        </div>
        <div className="p-3 border border-dashed border-gray-300 rounded bg-white">
          <p className="text-xs font-medium text-gray-500">
            🔄 Entity Flow Section
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScenarioAnalysisDashboard;
