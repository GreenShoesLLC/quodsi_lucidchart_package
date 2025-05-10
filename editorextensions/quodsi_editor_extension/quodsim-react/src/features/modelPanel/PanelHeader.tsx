import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { 
  ValidationState,
  ModelItemData,
  DiagramElementType,
  SimulationObjectType
} from '@quodsi/shared';
import { SimulationStatus } from '../../types/SimulationStatus';
import { SimulationComponentSelector } from '../../components/SimulationComponentSelector';
import { StatusIndicator } from '../shared/StatusIndicator';
import { getSimulationState } from '../../utils/simulationState';

interface PanelHeaderProps {
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ModelItemData | null;
  onValidate: () => void;
  onSimulate?: (scenarioName?: string) => void;
  onRemoveModel?: () => void;
  onElementTypeChange: (elementId: string, newType: SimulationObjectType) => void;
  diagramElementType?: DiagramElementType;
  simulationStatus?: SimulationStatus;
  onViewResults?: () => void;
}

/**
 * PanelHeader component that displays the model/element name and provides action buttons
 */
export const PanelHeader: React.FC<PanelHeaderProps> = ({
  modelName,
  validationState,
  currentElement,
  onValidate,
  onSimulate,
  onRemoveModel,
  onElementTypeChange,
  diagramElementType,
  simulationStatus,
  onViewResults
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [scenarioName, setScenarioName] = useState('New Scenario');
  
  // Reset the simulation button state when status changes
  useEffect(() => {
    if (simulationStatus && isSimulating) {
      // Check if the simulation is no longer running
      const scenarioStatus =
        simulationStatus?.pageStatus?.scenarios?.[0];
      if (
        scenarioStatus?.runState === "RAN_SUCCESSFULLY" ||
        scenarioStatus?.runState === "RAN_WITH_ERRORS"
      ) {
        setIsSimulating(false);
      }
    }
  }, [simulationStatus]);
  
  // Helper to get display name for the element
  const getDisplayName = (modelItemData: ModelItemData | null): string => {
    if (!modelItemData) return "No Selection";

    // Try to get name from the data object first (SimulationObject data)
    const simulationObjectName = (modelItemData.data as { name?: string })?.name;
    if (simulationObjectName) return simulationObjectName;

    // Fall back to ModelItemData.name if data.name isn't available
    if (modelItemData.name) return modelItemData.name;

    // Final fallback to id
    return `Item ${modelItemData.id}`;
  };
  
  const handleTypeChange = (newType: SimulationObjectType, elementId: string) => {
    console.log(`[PanelHeader] Type change for ${elementId}: ${newType}`);
    onElementTypeChange(elementId, newType);
  };
  
  const handleSimulateClick = () => {
    setIsSimulating(true);
    if (onSimulate) {
      onSimulate(scenarioName);
    }
  };
  
  // Render the model/element name section
  const renderModelName = () => {
    if (!currentElement && !modelName) return null;
    
    return (
      <div className="flex items-center gap-2">
        {modelName && (
          <span className="text-sm font-medium">{modelName}</span>
        )}
        {currentElement && (
          <span className="text-xs text-gray-500">
            Item {getDisplayName(currentElement)}
          </span>
        )}
      </div>
    );
  };
  
  // Add a scenario name input field for Model type
  const renderScenarioNameInput = () => {
    const isModel =
      currentElement?.metadata?.type === SimulationObjectType.Model;

    if (!isModel) return null;

    return (
      <div className="flex items-center mb-2">
        <label htmlFor="scenario-name" className="text-xs mr-2">
          Scenario Name:
        </label>
        <input
          id="scenario-name"
          type="text"
          className="text-xs p-1 border rounded flex-grow"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          disabled={isSimulating}
        />
      </div>
    );
  };
  
  // Render action buttons based on context
  const renderButtons = () => {
    // Define fixed width for buttons
    const buttonStyle = {
      minWidth: "110px",
      width: "33%",
      textAlign: "center" as const,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "32px",
    };

    // Handle case when no currentElement exists
    if (!currentElement) {
      return (
        onRemoveModel && (
          <button
            style={buttonStyle}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            onClick={onRemoveModel}
          >
            Remove Model
          </button>
        )
      );
    }

    const elementType = currentElement.metadata?.type || SimulationObjectType.None;

    // Handle Model type buttons
    if (elementType === SimulationObjectType.Model) {
      return (
        <div className="flex items-center justify-between gap-2 w-full">
          {onSimulate && (
            <button
              style={buttonStyle}
              className={`px-2 py-1 text-xs ${
                isSimulating
                  ? "bg-blue-500 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600"
              } text-white rounded`}
              onClick={handleSimulateClick}
              disabled={isSimulating}
            >
              {isSimulating
                ? "Running..."
                : getSimulationState(
                    simulationStatus?.pageStatus || null,
                    simulationStatus?.isPollingSimState || false
                  ).buttonLabel}
            </button>
          )}
          {onRemoveModel && (
            <button
              style={buttonStyle}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              onClick={onRemoveModel}
            >
              Remove Model
            </button>
          )}
        </div>
      );
    }

    // Handle unconverted items (Component Selector)
    if (currentElement.isUnconverted) {
      return (
        <SimulationComponentSelector
          elementId={currentElement.id}
          selectedType={elementType as SimulationObjectType}
          diagramElementType={diagramElementType}
          onTypeChange={handleTypeChange}
        />
      );
    }

    // Handle converted items (Component Selector)
    return (
      <div className="flex items-center gap-2">
        <SimulationComponentSelector
          elementId={currentElement.id}
          selectedType={elementType as SimulationObjectType}
          diagramElementType={diagramElementType}
          onTypeChange={handleTypeChange}
        />
      </div>
    );
  };
  
  // Render validation indicators
  const renderValidationIndicators = () => {
    if (!validationState) return null;
    
    const { errorCount, warningCount } = validationState.summary;
    
    return (
      <div className="flex items-center gap-2">
        {errorCount > 0 && (
          <StatusIndicator 
            type="error" 
            count={errorCount}
            text={`${errorCount} Error${errorCount !== 1 ? 's' : ''}`}
          />
        )}
        {warningCount > 0 && (
          <StatusIndicator 
            type="warning" 
            count={warningCount}
            text={`${warningCount} Warning${warningCount !== 1 ? 's' : ''}`}
          />
        )}
        {errorCount === 0 && warningCount === 0 && (
          <StatusIndicator 
            type="success" 
            text="Valid"
          />
        )}
      </div>
    );
  };

  return (
    <div className="p-2 space-y-2 border-b">
      {renderModelName()}
      <div className="flex items-center justify-between">
        {renderValidationIndicators()}
        <button
          className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800"
          onClick={onValidate}
        >
          Validate
        </button>
      </div>
      <div className="flex flex-col space-y-2">
        {renderScenarioNameInput()}
        {renderButtons()}
      </div>
    </div>
  );
};
