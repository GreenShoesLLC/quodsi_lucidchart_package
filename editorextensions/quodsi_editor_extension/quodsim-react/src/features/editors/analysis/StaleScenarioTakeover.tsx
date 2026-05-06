import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface StaleScenarioTakeoverProps {
  scenarioName: string;
  scenarioId: string;
  /** Optional callback to re-run the scenario. When omitted, no button renders. */
  onRerun?: (scenarioId: string) => void;
}

/**
 * Full-takeover card replacing the analysis dashboard when a single
 * scenario is incompatible with the current frontend build. Used when
 * the user opens an analysis view for a single stale scenario; the
 * dashboard's normal content (charts, tables) is suppressed in favor
 * of this clear "re-run required" message.
 */
export const StaleScenarioTakeover: React.FC<StaleScenarioTakeoverProps> = ({
  scenarioName,
  scenarioId,
  onRerun,
}) => (
  <div className="flex items-center justify-center p-8 bg-gray-50">
    <div className="text-center p-6 bg-white rounded-lg shadow-md border border-gray-200 max-w-md">
      <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
      <h3 className="text-base font-semibold text-gray-800 mb-2">Re-run required</h3>
      <p className="text-sm text-gray-600 mb-1">
        <span className="font-medium">{scenarioName}</span>
      </p>
      <p className="text-sm text-gray-500 mb-4">
        This run was produced with an older simulation engine and is no longer compatible.
      </p>
      {onRerun && (
        <button
          type="button"
          onClick={() => onRerun(scenarioId)}
          className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Re-run scenario
        </button>
      )}
    </div>
  </div>
);
