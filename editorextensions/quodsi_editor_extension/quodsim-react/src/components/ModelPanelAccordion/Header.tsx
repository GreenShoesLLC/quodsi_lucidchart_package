import React from "react";
import { AlertCircle } from "lucide-react";
import {
  ValidationState,
  ModelItemData,
  SimulationObjectType,
  MessageTypes,
  SimComponentType,
} from "@quodsi/shared";
import { SimulationComponentSelector } from "../SimulationComponentSelector";
import { ExtensionMessaging } from "@quodsi/shared";
import { typeMappers } from "../../utils/typeMappers";

interface HeaderProps {
  modelName: string;
  validationState: ValidationState | null;
  onValidate: () => void;
  modelItemData: ModelItemData | null;
  showModelName?: boolean;
  showModelItemName?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  modelName,
  validationState,
  onValidate,
  modelItemData,
  showModelName = true,
  showModelItemName = true,
}) => {
  const errorCount = validationState?.summary?.errorCount ?? 0;
  const messaging = ExtensionMessaging.getInstance();

  const handleSimulate = () => {
    messaging.sendMessage(MessageTypes.SIMULATE_MODEL);
  };

  const handleRemoveModel = () => {
    messaging.sendMessage(MessageTypes.REMOVE_MODEL);
  };

  const handleConvertPage = () => {
    messaging.sendMessage(MessageTypes.CONVERT_PAGE);
  };

  const handleRemoveComponent = () => {
    if (!modelItemData) return;
    messaging.sendMessage(MessageTypes.UPDATE_ELEMENT_DATA, {
      elementId: modelItemData.id,
      type: SimulationObjectType.None,
      data: {},
    });
  };

  const handleTypeChange = (newComponentType: SimComponentType) => {
    if (!modelItemData) return;
    const simulationType =
      typeMappers.mapComponentTypeToSimulationType(newComponentType);
    messaging.sendMessage(MessageTypes.UPDATE_ELEMENT_DATA, {
      elementId: modelItemData.id,
      type: simulationType,
      data: {},
    });
  };

  const renderButtons = () => {
    if (!modelItemData) {
      return (
        <button
          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
          onClick={handleConvertPage}
        >
          Convert
        </button>
      );
    }

    const elementType = modelItemData.metadata.type as SimulationObjectType;

    if (elementType === SimulationObjectType.Model) {
      return (
        <>
          <button
            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 mr-2"
            onClick={handleSimulate}
          >
            Simulate
          </button>
          <button
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 mr-2"
            onClick={handleRemoveModel}
          >
            Remove Model
          </button>
          <button
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={onValidate}
          >
            Validate
          </button>
        </>
      );
    }

    if (modelItemData.isUnconverted) {
      const currentComponentType = elementType
        ? typeMappers.mapSimulationTypeToComponentType(elementType)
        : SimComponentType.NONE;

      return (
        <SimulationComponentSelector
          elementId={modelItemData.id}
          currentType={currentComponentType}
          onTypeChange={handleTypeChange}
        />
      );
    }

    return (
      <button
        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
        onClick={handleRemoveComponent}
      >
        Remove Simulation Component
      </button>
    );
  };

  return (
    <div className="flex flex-col p-3 border-b bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {showModelName && (
            <div className="text-xs text-gray-600 mb-2">
              Model Name: {modelName || "New Model"}
            </div>
          )}
          {errorCount > 0 && (
            <div className="flex items-center text-red-500 text-xs">
              <AlertCircle size={14} className="mr-1" />
              {errorCount}
            </div>
          )}
        </div>
      </div>
      {showModelItemName && modelItemData && (
        <div className="text-xs text-gray-600 mb-2">
          Selected: {modelItemData.name || "Unnamed Model Item"}
        </div>
      )}
      <div className="flex items-center justify-end">{renderButtons()}</div>
    </div>
  );
};
