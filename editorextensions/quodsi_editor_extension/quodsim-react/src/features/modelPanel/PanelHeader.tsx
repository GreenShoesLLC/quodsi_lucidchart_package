import React, { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
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

/**
 * Helper function to get human-readable time ago
 */
const getTimeAgo = (date: Date | null): string => {
  if (!date) return '';

  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

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
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

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

  // Listen for MODEL_RUN_STATUS messages
  useEffect(() => {
    const handleStatusMessage = (event: MessageEvent) => {
      const msg = event.data as EnvelopeBase;

      // Check if this is a MODEL_RUN_STATUS message
      if (msg?.type === EnvelopeMessageType.MODEL_RUN_STATUS) {
        const data = msg.data as {
          jobId?: string;
          status?: string;
          progress?: number;
          currentStep?: string;
          lastChecked?: string;
          error?: string;
        };

        if (data.currentStep) {
          setCurrentStatus(data.currentStep);
        }

        if (data.lastChecked) {
          setLastChecked(new Date(data.lastChecked));
        }

        // Update isSimulating based on status
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          setIsSimulating(false);
        } else if (data.status === 'RUNNING' || data.status === 'PROCESSING' || data.status === 'QUEUED') {
          setIsSimulating(true);
        }
      }
    };

    window.addEventListener('message', handleStatusMessage);
    return () => window.removeEventListener('message', handleStatusMessage);
  }, []);

  // Timer to force re-render every second when simulating (to update "time ago" text)
  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      // Force re-render by updating a dummy state
      setLastChecked(prev => prev ? new Date(prev.getTime()) : null);
    }, 1000);

    return () => clearInterval(timer);
  }, [isSimulating]);

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
    setCurrentStatus('Starting simulation...');
    setLastChecked(new Date());
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
      // Build button label with status indicator
      let buttonLabel: string;
      if (isSimulating) {
        const timeAgo = getTimeAgo(lastChecked);
        const statusText = currentStatus || 'Running';
        buttonLabel = timeAgo ? `${statusText} (${timeAgo})` : statusText;
      } else {
        buttonLabel = getSimulationState(
          simulationStatus?.pageStatus || null,
          simulationStatus?.isPollingSimState || false
        ).buttonLabel;
      }

      return (
        <>
          {onSimulate && (
            <button
              className={
                isSimulating ? disabledButtonClasses : simulateButtonClasses
              }
              onClick={handleSimulateClick}
              disabled={isSimulating}
              title={isSimulating ? `Status: ${currentStatus || 'Running'}` : undefined}
            >
              {buttonLabel}
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
