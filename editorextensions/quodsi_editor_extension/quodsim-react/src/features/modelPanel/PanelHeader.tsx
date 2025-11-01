import React from "react";
import { Trash2 } from "lucide-react";
import {
  ValidationState,
  ModelItemData,
  DiagramElementType,
  SimulationObjectType,
} from "@quodsi/shared";
import { SimulationStatus } from "../../types/SimulationStatus";

import { StatusIndicator } from "../shared/StatusIndicator";
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
    if (onSimulate) {
      onSimulate("LucidChart");
    }
  };

  // Render action buttons based on context
  const renderButtons = () => {
    // Compact button style classes
    const buttonBaseClasses =
      "px-2 py-1 text-xs font-medium rounded transition-colors flex-1";
    const primaryButtonClasses = `${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 text-white`;
    const simulateButtonClasses = `${buttonBaseClasses} bg-green-600 hover:bg-green-700 text-white`;
    const dangerButtonClasses = `${buttonBaseClasses} bg-red-600 hover:bg-red-700 text-white`;
    const disabledButtonClasses = `${buttonBaseClasses} bg-gray-400 text-white cursor-not-allowed`;

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
        <>
          {onSimulate && (
            <button
              className={simulateButtonClasses}
              onClick={handleSimulateClick}
            >
              Simulate
            </button>
          )}
        </>
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
      <SimulationComponentSelector
        elementId={currentElement.id}
        selectedType={elementType as SimulationObjectType}
        diagramElementType={diagramElementType}
        onTypeChange={handleTypeChange}
      />
    );
  };

  // Render validation indicators
  const renderValidationIndicators = () => {
    if (!validationState) return null;

    const { errorCount, warningCount } = validationState.summary;

    return (
      <div className="flex items-center gap-1">
        {errorCount > 0 && (
          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
            {errorCount}E
          </span>
        )}
        {warningCount > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
            {warningCount}W
          </span>
        )}
        {errorCount === 0 && warningCount === 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
            ✓
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="p-2 border-b bg-gray-50 shadow-sm space-y-2">
      {/* Row 1: Model name and validation status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {modelName && (
            <span className="text-sm font-semibold text-gray-800 truncate">
              {modelName}
            </span>
          )}
          {currentElement && (
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded truncate">
              {getDisplayName(currentElement)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {renderValidationIndicators()}
          <button
            className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors"
            onClick={onValidate}
          >
            Validate
          </button>
        </div>
      </div>

      {/* Row 2: Action buttons */}
      <div className="flex gap-2">
        {renderButtons()}
      </div>
    </div>
  );
};
