import React, { useState, useEffect } from "react";
import { Trash2, FileJson } from "lucide-react";
import {
  ValidationState,
  ModelItemData,
  DiagramElementType,
  SimulationObjectType,
  EnvelopeMessageType,
  EnvelopeBase,
} from "@quodsi/shared";
import { SimulationStatus } from "../../types/SimulationStatus";

import { StatusIndicator } from "../shared/StatusIndicator";
import { getSimulationState } from "../../utils/simulationState";
import { ExtendedModelItemData } from "../../types/ModelItemData";
import { SimulationComponentSelector } from "../SimulationComponentSelector";
import { ModelDefinitionViewer } from "./ModelDefinitionViewer";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";

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
  const [isModelViewerOpen, setIsModelViewerOpen] = useState(false);
  const [modelJson, setModelJson] = useState<any>(null);

  const { requestModelJson } = useModelOpsSender();

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

  // Listen for MODEL_JSON_RESPONSE
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as EnvelopeBase;

      // Check if this is a MODEL_JSON_RESPONSE message
      if (msg?.type === EnvelopeMessageType.MODEL_JSON_RESPONSE) {
        const data = msg.data as {
          success: boolean;
          modelJson?: any;
          error?: string;
        };

        if (data.success && data.modelJson) {
          setModelJson(data.modelJson);
          setIsModelViewerOpen(true);
        } else {
          console.error('[PanelHeader] Failed to get model JSON:', data.error);
          // Could show an error message to user here
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
      onSimulate("LucidChart");
    }
  };

  const handleViewModelClick = () => {
    // Request model JSON from extension
    // We don't have documentId here, so we'll use an empty string
    // The extension will get it from the current context
    requestModelJson('');
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
              Remove
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
            className="text-xs px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded transition-colors flex items-center gap-1"
            onClick={handleViewModelClick}
            title="View Model Definition"
          >
            <FileJson className="w-3 h-3" />
            View Model
          </button>
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

      {/* Model Definition Viewer Modal */}
      {isModelViewerOpen && modelJson && (
        <ModelDefinitionViewer
          modelJson={modelJson}
          onClose={() => setIsModelViewerOpen(false)}
        />
      )}
    </div>
  );
};
