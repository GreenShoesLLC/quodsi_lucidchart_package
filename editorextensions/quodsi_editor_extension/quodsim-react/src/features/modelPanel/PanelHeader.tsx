import React, { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import {
  ValidationState,
  ModelItemData,
  DiagramElementType,
  SimulationObjectType,
} from "@quodsi/shared";
import { SimulationStatus } from "../../types/SimulationStatus";

import { StatusIndicator } from "../shared/StatusIndicator";
import { getSimulationState } from "../../utils/simulationState";
import { ExtendedModelItemData } from "../../types/ModelItemData";
import { SimulationComponentSelector } from "../SimulationComponentSelector";

interface PanelHeaderProps {
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ExtendedModelItemData | null;
  onValidate: () => void;
  onSimulate?: (scenarioName?: string) => void;
  onRemoveModel?: () => void;
  onElementTypeChange: (
    elementId: string,
    newType: SimulationObjectType
  ) => void;
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
  onViewResults,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [scenarioName, setScenarioName] = useState("New Scenario");

  // Reset the simulation button state when status changes
  useEffect(() => {
    if (simulationStatus && isSimulating) {
      // Check if the simulation is no longer running
      const scenarioStatus = simulationStatus?.pageStatus?.scenarios?.[0];
      if (
        scenarioStatus?.runState === "RAN_SUCCESSFULLY" ||
        scenarioStatus?.runState === "RAN_WITH_ERRORS"
      ) {
        setIsSimulating(false);
      }
    }
  }, [simulationStatus]);

  // Helper to get display name for the element
  const getDisplayName = (
    modelItemData: ExtendedModelItemData | null
  ): string => {
    if (!modelItemData) return "No Selection";

    // Try to get name from the data object first (SimulationObject data)
    const simulationObjectName = (modelItemData.data as { name?: string })
      ?.name;
    if (simulationObjectName) return simulationObjectName;

    // Fall back to ModelItemData.name if data.name isn't available
    if (modelItemData.name) return modelItemData.name;

    // Final fallback to id
    return `Item ${modelItemData.id}`;
  };

  const handleTypeChange = (
    newType: SimulationObjectType,
    elementId: string
  ) => {
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
          <span className="text-lg font-semibold text-gray-800">
            {modelName}
          </span>
        )}
        {currentElement && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-sm text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
              {getDisplayName(currentElement)}
            </span>
          </div>
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
      <div className="flex items-center space-x-3">
        <label
          htmlFor="scenario-name"
          className="text-sm text-gray-600 font-medium w-32"
        >
          Scenario Name:
        </label>
        <input
          id="scenario-name"
          type="text"
          className="text-sm p-2 border border-gray-300 rounded-md flex-grow shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          disabled={isSimulating}
        />
      </div>
    );
  };

  // Render action buttons based on context
  const renderButtons = () => {
    // Button style classes instead of inline styles
    const buttonBaseClasses =
      "px-3 py-2 min-w-[110px] w-1/3 flex justify-center items-center h-9 text-sm font-medium rounded-md shadow-sm transition-colors";
    const primaryButtonClasses = `${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 text-white`;
    const simulateButtonClasses = `${buttonBaseClasses} bg-green-600 hover:bg-green-700 text-white`;
    const dangerButtonClasses = `${buttonBaseClasses} bg-red-600 hover:bg-red-700 text-white`;
    const disabledButtonClasses = `${buttonBaseClasses} bg-blue-400 text-white cursor-not-allowed`;

    // Handle case when no currentElement exists
    if (!currentElement) {
      return (
        onRemoveModel && (
          <button className={dangerButtonClasses} onClick={onRemoveModel}>
            Remove Model
          </button>
        )
      );
    }

    const elementType =
      currentElement.metadata?.type || SimulationObjectType.None;

    // Handle Model type buttons
    if (elementType === SimulationObjectType.Model) {
      return (
        <div className="flex items-center justify-between gap-3 w-full">
          {onSimulate && (
            <button
              className={
                isSimulating ? disabledButtonClasses : simulateButtonClasses
              }
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
            <button className={dangerButtonClasses} onClick={onRemoveModel}>
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
            text={`${errorCount} Error${errorCount !== 1 ? "s" : ""}`}
          />
        )}
        {warningCount > 0 && (
          <StatusIndicator
            type="warning"
            count={warningCount}
            text={`${warningCount} Warning${warningCount !== 1 ? "s" : ""}`}
          />
        )}
        {errorCount === 0 && warningCount === 0 && (
          <StatusIndicator type="success" text="Valid" />
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-3 border-b bg-gradient-to-r from-blue-50 to-white shadow-sm">
      {renderModelName()}
      <div className="flex items-center justify-between">
        {renderValidationIndicators()}
        <button
          className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 rounded-md transition-colors border border-blue-100 flex items-center gap-1 font-medium"
          onClick={onValidate}
        >
          Validate
        </button>
      </div>
      <div className="flex flex-col space-y-3">
        {renderScenarioNameInput()}
        {renderButtons()}
      </div>
    </div>
  );
};
