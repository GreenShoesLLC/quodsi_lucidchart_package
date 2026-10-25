import React, { useState } from "react";
import { Wrench, AlertTriangle } from "lucide-react";
import {
  DiagramElementType,
  SimulationObjectType,
  getLogger,
} from "@quodsi/lucid-shared";
import { ExtendedModelItemData } from "../../types/ModelItemData";
import { DevToolsModal } from "../shared/DevToolsModal";
import {
  ShapeTypeSelect,
  useDevMode,
  type ShapeTypeOption,
} from "quodsi_studio/platforms/shared";
import { StudiesLaunchButton } from "./StudiesLaunchButton";
import { ProjectLaunchButton } from "quodsi_studio/platforms/shared";

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
  onElementTypeChange: (
    elementId: string,
    newType: SimulationObjectType
  ) => void;
  diagramElementType?: DiagramElementType;
}

/**
 * Host toolbar above the editor (ClickUp 86e39r8e5). Every converted element
 * and the model render a Studio shared editor directly beneath this, and its
 * EditorHeader already shows the icon, accent stripe, name and type -- so
 * this carries only what that header has no home for: the Studies and
 * Project launchers (model view), the type dropdown (element view) and, in
 * developer mode, the Developer Tools button. The
 * unconverted view is the exception: ModelPanel mounts no editor beneath it,
 * so it keeps a title and instruction.
 */
export const PanelHeader: React.FC<PanelHeaderProps> = ({
  currentElement,
  onElementTypeChange,
  diagramElementType,
}) => {
  const [devToolsModalOpen, setDevToolsModalOpen] = useState(false);

  // The Developer Tools button: the shared developer flag (quodsi_devmode),
  // which five clicks on the Status window's version line turn on or off. The Advisor is not gated:
  // each shared editor header shows its button (ModelPanel supplies the context).
  const devToolsEnabled = useDevMode();

  const handleTypeChange = (
    newType: SimulationObjectType,
    elementId: string
  ) => {
    log.debug(`Type change for ${elementId}: ${newType}`);
    onElementTypeChange(elementId, newType);
  };

  // Developer Tools, shown only in developer mode. Everything the old "..."
  // menu held now lives in the extension's Quodsi menu (src/core/quodsiMenu.ts)
  // or, for Settings, behind the account strip's gear.
  const DevToolsButton = () =>
    devToolsEnabled ? (
      <button
        onClick={() => setDevToolsModalOpen(true)}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
        title="Developer Tools"
        aria-label="Developer Tools"
      >
        <Wrench className="w-4 h-4 text-gray-600" />
      </button>
    ) : null;

  // Model toolbar: the Studies launcher (primary action; opens the compiled
  // Studies modal). Name and icon are ModelEditor's header's.
  const renderModelToolbar = () => (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <StudiesLaunchButton />
      </div>
      <ProjectLaunchButton />
      <DevToolsButton />
    </div>
  );

  // Element toolbar (Activity, Resource, Generator, Connector): the type
  // dropdown (to change or revert type). Name, icon and type
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
      <DevToolsButton />
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
          <DevToolsButton />
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
      <DevToolsModal
        isOpen={devToolsModalOpen}
        onClose={() => setDevToolsModalOpen(false)}
      />
    </>
  );
};
