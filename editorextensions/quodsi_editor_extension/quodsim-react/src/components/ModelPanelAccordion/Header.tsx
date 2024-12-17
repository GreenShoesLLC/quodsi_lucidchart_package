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
  currentElement: ModelItemData | null;
}

export const Header: React.FC<HeaderProps> = ({
  modelName,
  validationState,
  onValidate,
  currentElement,
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
    if (!currentElement) return;
    messaging.sendMessage(MessageTypes.UPDATE_ELEMENT_DATA, {
      elementId: currentElement.id,
      type: SimulationObjectType.None,
      data: {},
    });
  };

  const handleTypeChange = (newComponentType: SimComponentType) => {
    if (!currentElement) return;
    const simulationType =
      typeMappers.mapComponentTypeToSimulationType(newComponentType);
    messaging.sendMessage(MessageTypes.UPDATE_ELEMENT_DATA, {
      elementId: currentElement.id,
      type: simulationType,
      data: {},
    });
  };

  const renderButtons = () => {
    if (!currentElement) {
      return (
        <button
          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
          onClick={handleConvertPage}
        >
          Convert
        </button>
      );
    }

    const elementType = currentElement.metadata.type as SimulationObjectType;

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

    if (currentElement.isUnconverted) {
      const currentComponentType = elementType
        ? typeMappers.mapSimulationTypeToComponentType(elementType)
        : SimComponentType.NONE;

      return (
        <SimulationComponentSelector
          elementId={currentElement.id}
          currentType={currentComponentType}
          onTypeChange={handleTypeChange}
        />
      );
    }

    // if (
    //   !currentElement.isUnconverted &&
    //   elementType !== SimulationObjectType.Model
    // ) {
    else {
      return (
        <button
          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          onClick={handleRemoveComponent}
        >
          Remove Simulation Component
        </button>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col p-3 border-b bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="text-xs text-gray-600 mb-2">
            Model Name: {modelName || "New Model"}
          </div>
          {errorCount > 0 && (
            <div className="flex items-center text-red-500 text-xs">
              <AlertCircle size={14} className="mr-1" />
              {errorCount}
            </div>
          )}
        </div>
      </div>
      {currentElement && (
        <div className="text-xs text-gray-600 mb-2">
          Selected: {currentElement.name || "Unnamed Element"}
        </div>
      )}
      <div className="flex items-center justify-end">{renderButtons()}</div>
    </div>
  );
};
