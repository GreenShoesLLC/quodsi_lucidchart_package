import React from "react";
import { ISerializedScenario, RunState, SimulationRunDownloadInfo } from "@quodsi/shared";
import { Play, Trash2, Loader2 } from "lucide-react";

export interface ScenarioRunStatus {
  scenarioId: string;
  status: RunState;
  hasResults: boolean;
  downloadInfo?: SimulationRunDownloadInfo;
}

interface ScenarioCardProps {
  scenario: ISerializedScenario;
  runStatus?: ScenarioRunStatus;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onDelete?: () => void;
}

const statusDisplay: Record<string, { label: string; color: string }> = {
  [RunState.NotRun]: { label: "No run", color: "text-gray-400" },
  [RunState.Queued]: { label: "Queued", color: "text-yellow-600" },
  [RunState.Running]: { label: "Running", color: "text-blue-600" },
  [RunState.RanSuccessfully]: { label: "Ready", color: "text-green-600" },
  [RunState.RanWithErrors]: { label: "Error", color: "text-red-600" },
};

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  runStatus,
  isSelected,
  onSelect,
  onPlay,
  onDelete,
}) => {
  const status = runStatus?.status ?? RunState.NotRun;
  const display = statusDisplay[status] ?? statusDisplay[RunState.NotRun];
  const isActive = status === RunState.Queued || status === RunState.Running;
  const changeCount = scenario.changeRequests?.length ?? 0;

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b transition-colors ${
        isSelected
          ? "bg-blue-50 border-l-2 border-l-blue-500"
          : "hover:bg-gray-50 border-l-2 border-l-transparent"
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onPlay(); }}
        disabled={isActive}
        className={`flex-shrink-0 p-1 rounded transition-colors ${
          isActive
            ? "text-gray-300 cursor-not-allowed"
            : "text-green-600 hover:bg-green-50"
        }`}
        title={isActive ? "Simulation in progress" : "Run simulation"}
      >
        {isActive ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-800 truncate">
            {scenario.name}
          </span>
          {scenario.isBaseline && (
            <span className="text-[10px] px-1 py-0.5 bg-gray-100 text-gray-500 rounded">
              default
            </span>
          )}
        </div>
        {!scenario.isBaseline && changeCount > 0 && (
          <span className="text-[10px] text-gray-400">
            {changeCount} change{changeCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <span className={`text-[10px] font-medium ${display.color}`}>
        {display.label}
      </span>

      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors"
          title="Delete scenario"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
