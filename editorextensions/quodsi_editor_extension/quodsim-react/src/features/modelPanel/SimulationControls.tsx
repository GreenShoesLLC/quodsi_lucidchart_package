import React, { useState, useEffect } from 'react';
import { PageStatus, RunState } from '@quodsi/shared';
import { SimulationStatus } from '../../types/SimulationStatus';
import { AccordionSection } from '../shared/AccordionSection';
import { getSimulationState, getStatusClass } from '../../utils/simulationState';
import { StatusIndicator } from '../shared/StatusIndicator';

interface SimulationControlsProps {
  status: SimulationStatus;
  onSimulate: (scenarioName?: string) => void;
  onViewResults?: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * SimulationControls component that provides simulation control and status display
 */
export const SimulationControls: React.FC<SimulationControlsProps> = ({
  status,
  onSimulate,
  onViewResults,
  isExpanded,
  onToggle
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [scenarioName, setScenarioName] = useState('New Scenario');
  
  // Reset simulation state when status changes
  useEffect(() => {
    if (status && isSimulating) {
      const scenarioStatus = status.pageStatus?.scenarios?.[0];
      if (
        scenarioStatus?.runState === RunState.RanSuccessfully ||
        scenarioStatus?.runState === RunState.RanWithErrors
      ) {
        setIsSimulating(false);
      }
    }
  }, [status, isSimulating]);
  
  // Handle simulation start
  const handleSimulate = () => {
    setIsSimulating(true);
    onSimulate(scenarioName);
  };
  
  // Check if there are any completed scenarios
  const hasCompletedScenario = status?.pageStatus?.scenarios?.some(
    s => s.runState === RunState.RanSuccessfully
  );

  // Check if any scenarios have already been viewed
  const resultsAlreadyViewed = status?.pageStatus?.scenarios?.some(
    s => s.resultsViewed === true
  );
  
  // Show the button if there are completed scenarios and either:
  // 1. There are new results available, or
  // 2. Results haven't been viewed yet
  const showViewResultsButton = hasCompletedScenario && 
    (status?.newResultsAvailable || !resultsAlreadyViewed);
  
  // Get status text from utility function
  const { statusText } = getSimulationState(
    status?.pageStatus || null,
    status?.isPollingSimState || false
  );
  
  return (
    <AccordionSection
      title="Simulation Controls"
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-2">
        {/* Scenario name input */}
        <div className="flex items-center space-x-2">
          <label htmlFor="sim-scenario-name" className="text-xs text-gray-600 font-medium w-20">
            Scenario:
          </label>
          <input
            id="sim-scenario-name"
            type="text"
            className="text-xs px-2 py-1 border border-gray-300 rounded flex-grow shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            disabled={isSimulating}
          />
        </div>
        
        {/* Simulation status */}
        <div className="p-2 border border-gray-200 rounded bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="font-medium text-xs text-gray-700">Status:</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shadow-sm ${getStatusClass(statusText)}`}>
                {statusText}
              </span>
            </div>
            
            {/* Notification indicator when new results are available */}
            {status?.newResultsAvailable && (
              <div 
                className="relative w-5 h-5 bg-blue-500 rounded-full animate-pulse cursor-pointer flex items-center justify-center text-white shadow-md hover:bg-blue-600 transition-colors text-xs"
                onClick={onViewResults}
                title="New results available"
              >
                !
              </div>
            )}
          </div>
          
          {status?.pageStatus && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 bg-gray-50 p-1 rounded border border-gray-100">
                Last updated: {new Date(status.pageStatus.statusDateTime).toLocaleString()}
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSimulate}
                  disabled={isSimulating}
                  className={`flex-1 px-2 py-1 text-xs rounded shadow-sm text-white font-medium flex items-center justify-center gap-1 ${
                    isSimulating
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 transition-colors"
                  }`}
                >
                  {isSimulating ? "Running..." : "Run Simulation"}
                </button>
                
                {showViewResultsButton && (
                  <button
                    onClick={onViewResults}
                    className={`flex-1 px-2 py-1 text-xs rounded shadow-sm text-white font-medium flex items-center justify-center gap-1 ${
                      status?.newResultsAvailable 
                        ? "bg-green-600 animate-pulse hover:bg-green-700" 
                        : "bg-green-600 hover:bg-green-700 transition-colors"
                    }`}
                  >
                    {status?.newResultsAvailable ? "View New Results" : "View Results"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AccordionSection>
  );
};
