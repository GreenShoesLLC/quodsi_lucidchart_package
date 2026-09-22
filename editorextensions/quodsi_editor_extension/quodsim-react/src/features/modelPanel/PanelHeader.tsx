import React, { useState, useEffect, useRef } from "react";
import { Wrench, AlertTriangle, MoreVertical, Map, Info, FileJson, Activity, Trash2, Settings } from "lucide-react";
import {
  DiagramElementType,
  SimulationObjectType,
  getLogger,
} from "@quodsi/lucid-shared";
import { ExtendedModelItemData } from "../../types/ModelItemData";
import { AboutModal } from "../shared/AboutModal";
import { DevToolsModal } from "../shared/DevToolsModal";
import { RemoveModelModal } from "../shared/RemoveModelModal";
import {
  ShapeTypeSelect,
  useDevMode,
  type ShapeTypeOption,
} from "quodsi_studio/platforms/shared";
import { StudiesLaunchButton } from "./StudiesLaunchButton";

const log = getLogger("PanelHeader");

// The header's type dropdown is the SHARED ShapeTypeSelect, so its options,
// view gating and grandfathering live once (drawio and Visio use it through
// ShapeTypeSelector). A Lucid element type it has no option for shows None.
const SHAPE_TYPE_VALUES: readonly string[] = ["Activity", "Generator", "Resource", "Connector"];

function toShapeTypeOption(type: SimulationObjectType | string | undefined): ShapeTypeOption {
  return SHAPE_TYPE_VALUES.includes(type as string) ? (type as ShapeTypeOption) : "None";
}

const TYPE_SELECT_CLASS =
  "flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white";

interface PanelHeaderProps {
  currentElement: ExtendedModelItemData | null;
  onRemoveModel?: () => void;
  onOpenDiagramMapping?: () => void;
  onElementTypeChange: (
    elementId: string,
    newType: SimulationObjectType
  ) => void;
  diagramElementType?: DiagramElementType;
  onViewModelJson?: () => void;
  /** Opens Studio's /status in a tab. The Status item is hidden when absent
   *  (the extension reported no Studio URL). */
  onOpenStatus?: () => void;
  /**
   * Complexity Views (Task 11b) -- the DELIBERATE entry point to Settings,
   * as opposed to ViewTell's TEACHING entry point (see SettingsPanel.tsx's
   * own header comment for that pairing). Without this, a Basic-view Lucid
   * user whose model uses nothing hidden has no reachable control to change
   * their view at all: ViewTell only renders when a hidden surface is
   * actually in use. Lucid has no account-menu gear (its AccountStrip is
   * Lucid's own, unlike Studio's TopBar) -- this "..." panel menu is the
   * next best home.
   */
  onOpenSettings?: () => void;
}

/**
 * Host toolbar above the editor (ClickUp 86e39r8e5). Every converted element
 * and the model render a Studio shared editor directly beneath this, and its
 * EditorHeader already shows the icon, accent stripe, name and type -- so
 * this carries only what that header has no home for: the "..." menu, the
 * Studies launcher (model view) and the type dropdown (element view). The
 * unconverted view is the exception: ModelPanel mounts no editor beneath it,
 * so it keeps a title and instruction.
 */
export const PanelHeader: React.FC<PanelHeaderProps> = ({
  currentElement,
  onRemoveModel,
  onOpenDiagramMapping,
  onElementTypeChange,
  diagramElementType,
  onViewModelJson,
  onOpenStatus,
  onOpenSettings,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [devToolsModalOpen, setDevToolsModalOpen] = useState(false);
  const [removeModelModalOpen, setRemoveModelModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // The Developer Tools menu item: the shared developer flag (quodsi_devmode),
  // which the About dialog's five-click turns on. The Advisor is not gated:
  // each shared editor header shows its button (ModelPanel supplies the context).
  const devToolsEnabled = useDevMode();

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

  const handleTypeChange = (
    newType: SimulationObjectType,
    elementId: string
  ) => {
    log.debug(`Type change for ${elementId}: ${newType}`);
    onElementTypeChange(elementId, newType);
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
          {onOpenStatus && (
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenStatus();
              }}
              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
            >
              <Activity className="w-3 h-3 text-gray-500" />
              Status
            </button>
          )}
          <button
            onClick={() => {
              setMenuOpen(false);
              onOpenSettings?.();
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
          >
            <Settings className="w-3 h-3 text-gray-500" />
            Settings
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
          {/* Destructive — kept last and rule-separated from the navigational
              items above. Restores the "unconvert" path that was lost when the
              local conversion-preview UI was replaced by the embedded Studio
              mapping panel (ClickUp 86e2a5ff7). No gating needed: PanelHeader
              only renders once the page is a Quodsi model. */}
          {onRemoveModel && (
            <button
              onClick={() => {
                setMenuOpen(false);
                setRemoveModelModalOpen(true);
              }}
              className="w-full px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50 flex items-center gap-2 border-t"
            >
              <Trash2 className="w-3 h-3 text-red-600" />
              Remove Quodsi Model
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Model toolbar: the Studies launcher (primary action; opens the compiled
  // Studies modal) and the menu. Name and icon are ModelEditor's header's.
  const renderModelToolbar = () => (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <StudiesLaunchButton />
      </div>
      <MenuButton />
    </div>
  );

  // Element toolbar (Activity, Resource, Generator, Connector): the type
  // dropdown (to change or revert type) and the menu. Name, icon and type
  // label are the shared editor's header's.
  const renderElementToolbar = (element: ExtendedModelItemData, elementType: SimulationObjectType) => (
    <div className="flex items-center gap-2">
      <ShapeTypeSelect
        value={toShapeTypeOption(elementType)}
        is1D={diagramElementType === DiagramElementType.LINE}
        onChange={(next) => handleTypeChange(next as SimulationObjectType, element.id)}
        className={TYPE_SELECT_CLASS}
        aria-label="Element type"
      />
      <MenuButton />
    </div>
  );

  // Unconverted element: no editor renders beneath this, so it keeps a title
  // and instruction above the type dropdown.
  const renderUnconvertedHeader = (element: ExtendedModelItemData) => (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-900 truncate">
            Unconverted Element
          </span>
        </div>
        <div className="flex-shrink-0">
          <MenuButton />
        </div>
      </div>

      <div className="text-xs text-gray-600">
        Select element type to begin:
      </div>

      <ShapeTypeSelect
        value={toShapeTypeOption(element.metadata?.type)}
        is1D={diagramElementType === DiagramElementType.LINE}
        onChange={(next) => handleTypeChange(next as SimulationObjectType, element.id)}
        className={TYPE_SELECT_CLASS}
        aria-label="Element type"
      />
    </>
  );

  const renderToolbar = () => {
    if (!currentElement) return renderModelToolbar();

    const elementType = (currentElement.metadata?.type || SimulationObjectType.None) as SimulationObjectType;
    if (elementType === SimulationObjectType.Model) return renderModelToolbar();
    if (currentElement.isUnconverted) return renderUnconvertedHeader(currentElement);
    return renderElementToolbar(currentElement, elementType);
  };

  return (
    <>
      <div className="p-2 border-b bg-gray-50 space-y-2">
        {renderToolbar()}
      </div>
      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
      />
      <DevToolsModal
        isOpen={devToolsModalOpen}
        onClose={() => setDevToolsModalOpen(false)}
      />
      <RemoveModelModal
        isOpen={removeModelModalOpen}
        onClose={() => setRemoveModelModalOpen(false)}
        onConfirm={() => {
          setRemoveModelModalOpen(false);
          onRemoveModel?.();
        }}
      />
    </>
  );
};
