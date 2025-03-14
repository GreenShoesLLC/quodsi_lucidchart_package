// src/components/SimulationStatusMonitor.tsx
import React, { useEffect } from "react";
import { PageStatus, RunState } from "@quodsi/shared";
import { getSimulationState, getStatusClass } from "src/utils/simulationState";

interface Props {
  status: PageStatus | null;
  isPollingSimState: boolean;
  error: string | null;
  newResultsAvailable?: boolean;
  onViewResults?: () => void;
}

export const SimulationStatusMonitor: React.FC<Props> = ({
  status,
  isPollingSimState,
  error,
  newResultsAvailable = false,
  onViewResults
}) => {
  // Add debugging to log all props when they change
  useEffect(() => {
    console.log("[SimulationStatusMonitor] Props updated:", {
      status,
      isPollingSimState,
      error,
      newResultsAvailable,
      hasOnViewResults: !!onViewResults
    });
    
    // Log scenarios details if available
    if (status?.scenarios) {
      console.log("[SimulationStatusMonitor] Scenarios:", status.scenarios);
      
      // Check for completed scenarios
      const completedScenarios = status.scenarios.filter(s => s.runState === RunState.RanSuccessfully);
      console.log("[SimulationStatusMonitor] Completed scenarios:", completedScenarios);
      
      // Check for viewed status
      status.scenarios.forEach((s, i) => {
        console.log(`[SimulationStatusMonitor] Scenario ${i}:`, {
          id: s.id,
          name: s.name,
          runState: s.runState,
          resultsViewed: s.resultsViewed
        });
      });
    }
  }, [status, isPollingSimState, error, newResultsAvailable, onViewResults]);

  if (error) {
    return <div className="text-red-500 p-2 rounded bg-red-50">{error}</div>;
  }

  const { statusText } = getSimulationState(status, isPollingSimState);
  
  // Check if there are any completed scenarios
  const hasCompletedScenario = status?.scenarios?.some(
    s => s.runState === RunState.RanSuccessfully
  );

  // Check if any scenarios have already been viewed
  const resultsAlreadyViewed = status?.scenarios?.some(s => s.resultsViewed === true);
  
  // Show the button if there are completed scenarios and either:
  // 1. There are new results available, or
  // 2. Results haven't been viewed yet
  const showViewResultsButton = hasCompletedScenario && 
    (newResultsAvailable || !resultsAlreadyViewed);
    
  // Log the calculation
  console.log("[SimulationStatusMonitor] Button visibility calculation:", {
    hasCompletedScenario,
    newResultsAvailable,
    resultsAlreadyViewed,
    showViewResultsButton
  });

  return (
    <div className="p-2 border rounded bg-white">
      {/* Status header with notification indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">Simulation Status:</span>
          <span className={getStatusClass(statusText)}>{statusText}</span>
        </div>
        
        {/* Notification indicator when new results are available */}
        {newResultsAvailable && (
          <div 
            className="relative w-6 h-6 bg-blue-500 rounded-full animate-pulse cursor-pointer flex items-center justify-center text-white"
            onClick={onViewResults}
            title="New results available"
          >
            !
          </div>
        )}
      </div>

      {status && (
        <div className="space-y-1 text-sm">
          <div>Updated: {new Date(status.statusDateTime).toLocaleString()}</div>
          
          {/* DEBUG: Always show what triggered the button visibility decision */}
          {/* <div className="text-xs text-gray-500">
            Debug: Complete={hasCompletedScenario ? 'Y' : 'N'}, 
            New={newResultsAvailable ? 'Y' : 'N'}, 
            Viewed={resultsAlreadyViewed ? 'Y' : 'N'}
          </div> */}
          
          {/* Show View Results button only when needed */}
          {showViewResultsButton && (
            <button
              onClick={onViewResults}
              className={`mt-2 px-2 py-1 text-xs rounded text-white ${
                newResultsAvailable 
                  ? "bg-blue-500 animate-pulse hover:bg-blue-600" 
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {newResultsAvailable ? "View New Results" : "View Results"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};