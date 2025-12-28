import React, { useState, useEffect, useRef } from "react";
import { Factory, Wrench, Users, Package, Zap, ArrowRight, AlertTriangle, MoreVertical, Play, Loader, Network, Map, Info, FileJson } from "lucide-react";
import {
  ValidationState,
  ModelItemData,
  DiagramElementType,
  SimulationObjectType,
  EditorReferenceData,
  MAX_SCENARIOS,
} from "@quodsi/shared";
import { SimulationPollState } from "../../types/SimulationStatus";
import { ExtendedModelItemData } from "../../types/ModelItemData";
import { SimulationComponentSelector } from "../SimulationComponentSelector";
import { useHasActiveJobs } from "../../messaging/hooks/useHasActiveJobs";
import { useScenarios } from "../../messaging/MessageProvider";
import { selectScenarios } from "../../messaging/state/scenarioSlice";
import { AboutModal } from "../shared/AboutModal";

interface PanelHeaderProps {
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ExtendedModelItemData | null;
  onSimulate?: (scenarioName?: string) => void;
  onRemoveModel?: () => void;
  onOpenDiagramMapping?: () => void;
  onElementTypeChange: (
    elementId: string,
    newType: SimulationObjectType
  ) => void;
  diagramElementType?: DiagramElementType;
  simulationStatus?: SimulationPollState;
  onViewResults?: () => void;
  referenceData?: EditorReferenceData;
  onViewModelJson?: () => void;
}

/**
 * PanelHeader component that displays the model/element name and provides action buttons
 */
export const PanelHeader: React.FC<PanelHeaderProps> = ({
  modelName,
  validationState,
  currentElement,
  onSimulate,
  onRemoveModel,
  onOpenDiagramMapping,
  onElementTypeChange,
  diagramElementType,
  simulationStatus,
  onViewResults,
  referenceData,
  onViewModelJson,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasActiveJobs = useHasActiveJobs();

  // Get scenarios to check limit
  const scenarioState = useScenarios();
  const scenarios = selectScenarios({ scenarios: scenarioState });
  const atScenarioLimit = scenarios.length >= MAX_SCENARIOS;

  // Click-outside handler to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

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
      // Set loading state
      setIsSimulating(true);

      // Generate user-friendly scenario name with timestamp
      const now = new Date();
      const year = now.getFullYear();
      const twoDigitYear = String(year).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      const scenarioName = `${twoDigitYear}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      onSimulate(scenarioName);

      // Clear loading state after 2 seconds
      setTimeout(() => {
        setIsSimulating(false);
      }, 2000);
    }
  };

  // Helper to get icon for element type
  const getElementIcon = (type: SimulationObjectType) => {
    switch (type) {
      case SimulationObjectType.Model:
        return Network;
      case SimulationObjectType.Activity:
        return Wrench;
      case SimulationObjectType.Resource:
        return Users;
      case SimulationObjectType.Entity:
        return Package;
      case SimulationObjectType.Generator:
        return Factory;
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

  // Reusable menu button with dropdown
  const MenuButton = () => (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
        title="More options"
      >
        <MoreVertical className="w-4 h-4 text-gray-600" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow-lg z-50 min-w-[140px]">
          {onViewModelJson && (
            <button
              onClick={() => {
                setMenuOpen(false);
                onViewModelJson();
              }}
              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
            >
              <FileJson className="w-3 h-3 text-gray-500" />
              View Model JSON
            </button>
          )}
          <button
            onClick={() => {
              setMenuOpen(false);
              setAboutModalOpen(true);
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
          >
            <Info className="w-3 h-3 text-gray-500" />
            About Quodsi
          </button>
        </div>
      )}
    </div>
  );

  // Render Model header
  const renderModelHeader = () => {
    const Icon = Network;
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
          <MenuButton />
        </div>

        {/* Row 2: Statistics */}
        <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
          {stats && (
            <>
              <span>{stats.activities} Activities</span>
              <span>•</span>
              <span>{stats.resources} Resources</span>
            </>
          )}
        </div>

        {/* Row 3: Action buttons */}
        <div className="flex gap-2">
          {onSimulate && (
            <button
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSimulateClick}
              disabled={isSimulating || hasActiveJobs || atScenarioLimit}
              title={
                atScenarioLimit
                  ? `Maximum ${MAX_SCENARIOS} scenarios reached. Delete a scenario to continue.`
                  : hasActiveJobs
                  ? "Another simulation is running. Please wait for it to complete."
                  : "Run simulation"
              }
            >
              {atScenarioLimit ? (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Scenario Limit Reached
                </>
              ) : hasActiveJobs ? (
                <>
                  <Loader className="w-3 h-3 animate-spin" />
                  Simulation Running...
                </>
              ) : isSimulating ? (
                <>
                  <Loader className="w-3 h-3 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Run Simulation
                </>
              )}
            </button>
          )}
          {onOpenDiagramMapping && (
            <button
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center justify-center gap-1"
              onClick={onOpenDiagramMapping}
              title="View and modify element type mappings"
            >
              <Map className="w-3 h-3" />
              Diagram Mapping
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
          <MenuButton />
        </div>

        {/* Row 2: Context */}
        <div className="text-xs text-gray-600">
          {typeLabel} in "{modelName}"
        </div>

        {/* Row 3: Type Selector (to change or revert type) */}
        <div>
          {currentElement && (
            <SimulationComponentSelector
              elementId={currentElement.id}
              selectedType={elementType}
              diagramElementType={diagramElementType}
              onTypeChange={handleTypeChange}
            />
          )}
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
          <MenuButton />
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
    <>
      <div className="p-2 border-b bg-gray-50 shadow-sm space-y-2">
        {renderAdaptiveHeader()}
      </div>
      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
      />
    </>
  );
};
