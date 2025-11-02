import React, { useState } from "react";
import { Factory, Wrench, Users, Package, Zap, ArrowRight, AlertTriangle, MoreVertical, Play } from "lucide-react";
import {
  ValidationState,
  ModelItemData,
  DiagramElementType,
  SimulationObjectType,
  EditorReferenceData,
} from "@quodsi/shared";
import { SimulationStatus } from "../../types/SimulationStatus";
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
  referenceData?: EditorReferenceData;
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
  referenceData,
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
      // Generate user-friendly scenario name with timestamp
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      const scenarioName = `Run ${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      onSimulate(scenarioName);
    }
  };

  // Helper to get icon for element type
  const getElementIcon = (type: SimulationObjectType) => {
    switch (type) {
      case SimulationObjectType.Model:
        return Factory;
      case SimulationObjectType.Activity:
        return Wrench;
      case SimulationObjectType.Resource:
        return Users;
      case SimulationObjectType.Entity:
        return Package;
      case SimulationObjectType.Generator:
        return Zap;
      case SimulationObjectType.Connector:
        return ArrowRight;
      default:
        return AlertTriangle;
    }
  };

  // Helper to get model statistics
  const getModelStats = () => {
    if (!referenceData) return null;

    const activities = referenceData.activities?.length || 0;
    const resources = referenceData.resources?.length || 0;
    const entities = referenceData.entities?.length || 0;

    return { activities, resources, entities };
  };

  // Helper to render validation badges
  const renderValidationBadges = () => {
    if (!validationState) return null;

    const { errorCount, warningCount } = validationState.summary;

    return (
      <div className="flex items-center gap-1">
        {errorCount > 0 && (
          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
            {errorCount}E
          </span>
        )}
        {warningCount > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
            {warningCount}W
          </span>
        )}
        {errorCount === 0 && warningCount === 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
            ✓ 0E
          </span>
        )}
      </div>
    );
  };

  // Render Model header
  const renderModelHeader = () => {
    const Icon = Factory;
    const stats = getModelStats();

    return (
      <>
        {/* Row 1: Icon + Model name + Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate">
              {modelName}
            </span>
          </div>
          <button className="p-1 hover:bg-gray-200 rounded transition-colors" title="More options">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Row 2: Statistics + Validation */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            {stats && (
              <>
                <span>{stats.activities} Activities</span>
                <span>•</span>
                <span>{stats.resources} Resources</span>
              </>
            )}
          </div>
          {renderValidationBadges()}
        </div>

        {/* Row 3: Action buttons */}
        <div className="flex gap-2">
          <button
            className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            onClick={onValidate}
          >
            Validate Model
          </button>
          {onSimulate && (
            <button
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center justify-center gap-1"
              onClick={handleSimulateClick}
            >
              <Play className="w-3 h-3" />
              Run Simulation
            </button>
          )}
        </div>
      </>
    );
  };

  // Render element header (Activity, Resource, Entity, Generator, Connector)
  const renderElementHeader = (elementType: SimulationObjectType, elementName: string) => {
    const Icon = getElementIcon(elementType);
    const typeLabel = elementType.toString();

    return (
      <>
        {/* Row 1: Icon + Element name + Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate">
              {elementName}
            </span>
          </div>
          <button className="p-1 hover:bg-gray-200 rounded transition-colors" title="More options">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Row 2: Context + Validation */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">
            {typeLabel} in "{modelName}"
          </span>
          {renderValidationBadges()}
        </div>

        {/* Row 3: Action buttons */}
        <div className="flex gap-2">
          <button
            className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            onClick={onValidate}
          >
            Validate
          </button>
        </div>
      </>
    );
  };

  // Render unconverted element header
  const renderUnconvertedHeader = () => {
    const Icon = AlertTriangle;

    return (
      <>
        {/* Row 1: Warning icon + Title + Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate">
              Unconverted Element
            </span>
          </div>
          <button className="p-1 hover:bg-gray-200 rounded transition-colors" title="More options">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Row 2: Instruction */}
        <div className="text-xs text-gray-600">
          Select element type to begin:
        </div>

        {/* Row 3: Component Selector */}
        <div>
          {currentElement && (
            <SimulationComponentSelector
              elementId={currentElement.id}
              selectedType={(currentElement.metadata?.type || SimulationObjectType.None) as SimulationObjectType}
              diagramElementType={diagramElementType}
              onTypeChange={handleTypeChange}
            />
          )}
        </div>
      </>
    );
  };

  // Main adaptive header renderer
  const renderAdaptiveHeader = () => {
    if (!currentElement) {
      // No element selected, show model view
      return renderModelHeader();
    }

    const elementType = (currentElement.metadata?.type || SimulationObjectType.None) as SimulationObjectType;

    if (elementType === SimulationObjectType.Model) {
      return renderModelHeader();
    }

    if (currentElement.isUnconverted) {
      return renderUnconvertedHeader();
    }

    return renderElementHeader(elementType, getDisplayName(currentElement));
  };

  return (
    <div className="p-2 border-b bg-gray-50 shadow-sm space-y-2">
      {renderAdaptiveHeader()}
    </div>
  );
};
