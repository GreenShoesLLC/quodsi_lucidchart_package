import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface StaleScenarioRowProps {
  scenarioName: string;
  scenarioId: string;
  /** Optional callback to re-run the scenario. When omitted, no button renders.
   *  This degradation lets the row stay informative in render trees that don't
   *  yet have access to the rerun action (e.g., the modal results path). */
  onRerun?: (scenarioId: string) => void;
}

/**
 * Row indicator for a scenario whose output_schema_version is incompatible
 * with the current frontend build. Used in mixed-compatibility comparison
 * views. The scenario's data is excluded from charts and tables; this row
 * communicates that exclusion and offers a per-row re-run action.
 */
export const StaleScenarioRow: React.FC<StaleScenarioRowProps> = ({
  scenarioName,
  scenarioId,
  onRerun,
}) => (
  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 text-xs">
    <div className="flex items-center gap-2 min-w-0">
      <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
      <span className="text-gray-700 truncate">{scenarioName}</span>
      <span className="text-gray-500 italic">stale — re-run required</span>
    </div>
    {onRerun && (
      <button
        type="button"
        aria-label={`Re-run scenario ${scenarioName}`}
        onClick={() => onRerun(scenarioId)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
      >
        <RefreshCw className="w-3 h-3" />
        Re-run
      </button>
    )}
  </div>
);
