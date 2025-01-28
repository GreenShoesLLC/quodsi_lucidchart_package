import React from "react";
import { DiagramElementType, SimulationObjectType } from "@quodsi/shared";
import { ValidationState } from "@quodsi/shared/dist/types/accordion/ValidationState";
import { ModelItemData } from "@quodsi/shared/dist/types/messaging/payloads/ModelItemData";
import { SimulationComponentSelector } from "../SimulationComponentSelector";
import { SimulationStatusMonitor } from "../SimulationStatusMonitor";
import { Trash2 } from "lucide-react";
import { getSimulationState } from "src/utils/simulationState";
import { SimulationStatus } from "src/types/SimulationStatus";

interface HeaderProps {
  modelName: string;
  validationState: ValidationState | null;
  onValidate: () => void;
  modelItemData: ModelItemData | null;
  showModelName: boolean;
  showModelItemName: boolean;
  elementType?: SimulationObjectType;
  diagramElementType?: DiagramElementType;
  onTypeChange: (elementId: string, newType: SimulationObjectType) => void;
  onRemoveComponent?: (elementId: string) => void;
  onSimulate?: () => void;
  onRemoveModel?: () => void;
  onConvertPage?: () => void;
  simulationStatus: SimulationStatus;
}

export class Header extends React.Component<HeaderProps> {
  handleTypeChange = (newType: SimulationObjectType, elementId: string) => {
    if (this.props.onTypeChange) {
      this.props.onTypeChange(elementId, newType);
    }
  };

  handleRemoveComponent = () => {
    const { modelItemData, onRemoveComponent } = this.props;
    if (modelItemData?.id && onRemoveComponent) {
      onRemoveComponent(modelItemData.id);
    }
  };

  getDisplayName = (modelItemData: ModelItemData | null): string => {
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

  renderModelName() {
    const { modelName, modelItemData, showModelName, showModelItemName } =
      this.props;
    if (!modelItemData && !showModelName) return null;

    return (
      <div className="flex items-center gap-2">
        {showModelName && (
          <span className="text-sm font-medium">{modelName}</span>
        )}
        {showModelItemName && modelItemData && (
          <span className="text-xs text-gray-500">
            Item {this.getDisplayName(modelItemData)}
          </span>
        )}
      </div>
    );
  }

  renderButtons() {
    const {
      modelItemData,
      onValidate,
      onSimulate,
      onRemoveModel,
      onConvertPage,
      elementType: propsElementType,
      diagramElementType,
      simulationStatus,
    } = this.props;

    // Handle case when no modelItemData exists (Convert button)
    if (!modelItemData) {
      return (
        onConvertPage && (
          <button
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={onConvertPage}
          >
            Initialize Quodsi Model
          </button>
        )
      );
    }

    const elementType =
      (modelItemData.metadata?.type as SimulationObjectType) ||
      propsElementType ||
      SimulationObjectType.None;

    // Handle Model type buttons (Simulate, Remove Model, Validate)
    if (elementType === SimulationObjectType.Model) {
      return (
        <div className="flex items-center gap-2">
          {onSimulate && (
            <button
              className={`px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded`}
              onClick={onSimulate}
              disabled={false}
            >
              {
                getSimulationState(
                  simulationStatus.pageStatus,
                  simulationStatus.isPollingSimState
                ).buttonLabel
              }
            </button>
          )}
          {onRemoveModel && (
            <button
              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              onClick={onRemoveModel}
            >
              Remove Model
            </button>
          )}
          {onValidate && (
            <button
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={onValidate}
            >
              Validate
            </button>
          )}
        </div>
      );
    }

    // Handle unconverted items (Component Selector)
    if (modelItemData.isUnconverted) {
      return (
        <SimulationComponentSelector
          elementId={modelItemData.id}
          selectedType={elementType}
          diagramElementType={diagramElementType}
          onTypeChange={this.handleTypeChange}
        />
      );
    }

    // Handle converted items (Component Selector and Remove button)
    return (
      <div className="flex items-center gap-2">
        <SimulationComponentSelector
          elementId={modelItemData.id}
          selectedType={elementType}
          diagramElementType={diagramElementType}
          onTypeChange={this.handleTypeChange}
        />
        {!modelItemData.isUnconverted && this.props.onRemoveComponent && (
          <button
            className="p-2 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            onClick={this.handleRemoveComponent}
            title="Remove Simulation Component"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    );
  }

  render() {
    const { modelItemData, simulationStatus } = this.props;
    const isModel =
      modelItemData?.metadata?.type === SimulationObjectType.Model;

    return (
      <div className="p-2 space-y-2 border-b">
        {this.renderModelName()}
        <div className="flex flex-col space-y-2">
          {this.renderButtons()}

          {/* Show SimulationStatusMonitor only when viewing a model */}
          {isModel && (
            <>
              <div className="border-t my-2" />
              <SimulationStatusMonitor
                status={simulationStatus.pageStatus}
                isPollingSimState={false}
                error={simulationStatus.errorMessage}
              />
            </>
          )}
        </div>
      </div>
    );
  }
}
