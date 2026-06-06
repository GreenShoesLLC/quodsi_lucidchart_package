import React, { useState, useEffect, useRef } from "react";
import { Factory, Wrench, Users, Package, Zap, ArrowRight, AlertTriangle, MoreVertical, Network, Map, Info, FileJson, Sliders } from "lucide-react";
import {
  ValidationState,
  DiagramElementType,
  SimulationObjectType,
  EditorReferenceData,
  SCENARIOS_DB_AUTHORITATIVE,
} from "@quodsi/shared";
import { ExtendedModelItemData } from "../../types/ModelItemData";
import { SimulationComponentSelector } from "../SimulationComponentSelector";
import { AboutModal } from "../shared/AboutModal";
import { DevToolsModal } from "../shared/DevToolsModal";
import { PreferencesModal } from "../shared/PreferencesModal";
import { getEditorAccentClass, getEditorIconClass } from "../../constants/editorColors";
import { ScenariosLaunchButton } from "./ScenariosLaunchButton";

interface PanelHeaderProps {
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ExtendedModelItemData | null;
  editorType: string;
  onRemoveModel?: () => void;
  onOpenDiagramMapping?: () => void;
  onElementTypeChange: (
    elementId: string,
    newType: SimulationObjectType
  ) => void;
  diagramElementType?: DiagramElementType;
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
  editorType,
  onRemoveModel,
  onOpenDiagramMapping,
  onElementTypeChange,
  diagramElementType,
  referenceData,
  onViewModelJson,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [devToolsModalOpen, setDevToolsModalOpen] = useState(false);
  const [devToolsEnabled, setDevToolsEnabled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check for developer tools flag on mount and when about modal closes
  useEffect(() => {
    setDevToolsEnabled(localStorage.getItem('quodsi_devtools') === 'true');
  }, [aboutModalOpen]);

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
          {onOpenDiagramMapping && (
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenDiagramMapping();
              }}
              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
            >
              <Map className="w-3 h-3 text-gray-500" />
              Diagram Mapping
            </button>
          )}
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
          {devToolsEnabled && (
            <button
              onClick={() => {
                setMenuOpen(false);
                setDevToolsModalOpen(true);
              }}
              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
            >
              <Wrench className="w-3 h-3 text-gray-500" />
              Developer Tools
            </button>
          )}
          <button
            onClick={() => {
              setMenuOpen(false);
              setPreferencesModalOpen(true);
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
          >
            <Sliders className="w-3 h-3 text-gray-500" />
            Preferences
          </button>
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
        {/* Row 1: Icon + Model name + Auth + Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={`w-5 h-5 ${getEditorIconClass(editorType)} flex-shrink-0`} />
            <span className="text-sm font-semibold text-gray-900 truncate">
              {modelName}
            </span>
          </div>
          <div className="flex-shrink-0">
            <MenuButton />
          </div>
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

        {/* Row 3: Scenarios launcher (primary action; replaces the old labeled
            Scenarios "tab" in ModelEditor when the DB-authoritative modal is on) */}
        {SCENARIOS_DB_AUTHORITATIVE && <ScenariosLaunchButton />}
      </>
    );
  };

  // Render element header (Activity, Resource, Entity, Generator, Connector)
  const renderElementHeader = (elementType: SimulationObjectType, elementName: string) => {
    const Icon = getElementIcon(elementType);
    const typeLabel = elementType.toString();

    return (
      <>
        {/* Row 1: Icon + Element name + Auth + Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={`w-5 h-5 ${getEditorIconClass(editorType)} flex-shrink-0`} />
            <span className="text-sm font-semibold text-gray-900 truncate">
              {elementName}
            </span>
          </div>
          <div className="flex-shrink-0">
            <MenuButton />
          </div>
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
        {/* Row 1: Warning icon + Title + Auth + Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate">
              Unconverted Element
            </span>
          </div>
          <div className="flex-shrink-0">
            <MenuButton />
          </div>
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
      <div className={`p-2 border-b bg-gray-50 shadow-sm space-y-2 border-l-[3px] ${getEditorAccentClass(editorType)}`}>
        {renderAdaptiveHeader()}
      </div>
      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
      />
      <PreferencesModal
        isOpen={preferencesModalOpen}
        onClose={() => setPreferencesModalOpen(false)}
      />
      <DevToolsModal
        isOpen={devToolsModalOpen}
        onClose={() => setDevToolsModalOpen(false)}
      />
    </>
  );
};
