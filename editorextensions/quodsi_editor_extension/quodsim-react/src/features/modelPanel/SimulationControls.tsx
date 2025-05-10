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
      <div className="space-y-4">
        {/* Scenario name input */}
        <div className="flex items-center">
          <label htmlFor="scenario-name" className="text-sm mr-2 w-32">
            Scenario Name:
          </label>
          <input
            id="scenario-name"
            type="text"
            className="text-sm p-1 border rounded flex-grow"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            disabled={isSimulating}
          />
        </div>
        
        {/* Simulation status */}
        <div className="p-2 border rounded bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Status:</span>
              <span className={`text-sm ${getStatusClass(statusText)}`}>
                {statusText}
              </span>
            </div>
            
            {/* Notification indicator when new results are available */}
            {status?.newResultsAvailable && (
              <div 
                className="relative w-6 h-6 bg-blue-500 rounded-full animate-pulse cursor-pointer flex items-center justify-center text-white"
                onClick={onViewResults}
                title="New results available"
              >
                !
              </div>
            )}
          </div>
          
          {status?.pageStatus && (
            <div className="space-y-1 text-xs">
              <div>Updated: {new Date(status.pageStatus.statusDateTime).toLocaleString()}</div>
              
              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSimulate}
                  disabled={isSimulating}
                  className={`px-3 py-1 text-sm rounded text-white ${
                    isSimulating
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  {isSimulating ? "Running..." : "Run Simulation"}
                </button>
                
                {showViewResultsButton && (
                  <button
                    onClick={onViewResults}
                    className={`px-3 py-1 text-sm rounded text-white ${
                      status?.newResultsAvailable 
                        ? "bg-green-500 animate-pulse hover:bg-green-600" 
                        : "bg-green-500 hover:bg-green-600"
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
