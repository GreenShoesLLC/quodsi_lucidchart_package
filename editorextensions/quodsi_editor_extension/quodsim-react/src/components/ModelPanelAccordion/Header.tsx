import React from "react";
import { DiagramElementType, SimulationObjectType } from "@quodsi/shared";
import { ValidationState } from "@quodsi/shared/dist/types/accordion/ValidationState";
import { ModelItemData } from "@quodsi/shared/dist/types/messaging/payloads/ModelItemData";
import { SimulationComponentSelector } from "../SimulationComponentSelector";
import { Trash2 } from "lucide-react";

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
            Page {modelItemData.name}
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
              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              onClick={onSimulate}
            >
              Simulate
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
    return (
      <div className="p-2 space-y-2 border-b">
        {this.renderModelName()}
        {this.renderButtons()}
      </div>
    );
  }
}
