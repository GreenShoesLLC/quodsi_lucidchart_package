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
  PanelLaunchBar,
  ShapeTypeSelect,
  useDevMode,
  type AdvisorFocus,
  type ShapeTypeOption,
} from "quodsi_studio/platforms/shared";
import { useLucidStudiesLaunch } from "./useLucidStudiesLaunch";

const log = getLogger("PanelHeader");

// The header's type dropdown is the SHARED ShapeTypeSelect, so its options,
// view gating and grandfathering live once (drawio and Visio use it through
// ShapeTypeSelector). A Lucid element type it has no option for shows None.
const SHAPE_TYPE_VALUES: readonly string[] = ["Activity", "Generator", "Resource", "Connector"];

function toShapeTypeOption(type: SimulationObjectType | string | undefined): ShapeTypeOption {
  return SHAPE_TYPE_VALUES.includes(type as string) ? (type as ShapeTypeOption) : "None";
}

/**
 * What the header's Advisor button consults on: the selected converted
 * element, as its editor's own Advisor button did before the launch bar took
 * that job (user decision 2026-11-07). A Resource block is a pointer, so it
 * focuses the model-level resource it points at; an unlinked one, the model,
 * an unconverted shape or a swimlane gives no focus, and the button opens the
 * project. Exported for unit testing.
 */
export function lucidAdvisorFocus(element: ExtendedModelItemData | null): AdvisorFocus | undefined {
  if (!element || element.isUnconverted) return undefined;
  const type = element.metadata?.type;
  if (!SHAPE_TYPE_VALUES.includes(type as string)) return undefined;
  const data = (element.data ?? {}) as { name?: unknown; resourceId?: unknown };
  if (type === "Resource") {
    // The block's name is not the resource's: leave it to the Advisor's own lookup.
    return typeof data.resourceId === "string" && data.resourceId
      ? { id: data.resourceId, type: "Resource", mode: "definition" }
      : undefined;
  }
  const name = element.name || (typeof data.name === "string" ? data.name : "") || undefined;
  return { id: element.id, type: type as AdvisorFocus["type"], name, mode: "definition" };
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
  /** A swimlane draws its own header: show the launch bar only. */
  isSwimLane?: boolean;
}

/**
 * Host toolbar above the editor (ClickUp 86e39r8e5). Its first row is the
 * shared PanelLaunchBar, in every view as in drawio (user decision
 * 2026-11-07): the Advisor (the panel's only Advisor button; it follows the
 * selection), What-if Analysis and, in developer mode, the Developer Tools
 * button. Below it, an element view adds the type dropdown. The shared
 * editor beneath shows the icon, name, accent stripe and type. The
 * unconverted view is the exception: ModelPanel mounts no editor beneath it,
 * so it keeps a title and instruction.
 */
export const PanelHeader: React.FC<PanelHeaderProps> = ({
  currentElement,
  onElementTypeChange,
  diagramElementType,
  isSwimLane = false,
}) => {
  const [devToolsModalOpen, setDevToolsModalOpen] = useState(false);
  const studies = useLucidStudiesLaunch();

  // The Developer Tools button: the shared developer flag (quodsi_devmode),
  // which five clicks on the Status window's version line turn on or off.
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
  const devToolsButton = devToolsEnabled ? (
    <button
      onClick={() => setDevToolsModalOpen(true)}
      className="p-1 hover:bg-gray-200 rounded transition-colors"
      title="Developer Tools"
      aria-label="Developer Tools"
    >
      <Wrench className="w-4 h-4 text-gray-600" />
    </button>
  ) : null;

  const elementType = (currentElement?.metadata?.type || SimulationObjectType.None) as SimulationObjectType;
  const isElement = !isSwimLane && !!currentElement && elementType !== SimulationObjectType.Model;

  // Element views (converted or not) add the type dropdown (to change or
  // revert type) below the launch bar.
  const renderTypeSelect = (element: ExtendedModelItemData, value: SimulationObjectType | string | undefined) => (
    <ShapeTypeSelect
      value={toShapeTypeOption(value)}
      is1D={diagramElementType === DiagramElementType.LINE}
      onChange={(next) => handleTypeChange(next as SimulationObjectType, element.id)}
      className={TYPE_SELECT_CLASS}
      aria-label="Element type"
    />
  );

  // Unconverted element: no editor renders beneath this, so it keeps a title
  // and instruction above the type dropdown.
  const renderUnconverted = (element: ExtendedModelItemData) => (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-900 truncate">
          Unconverted Element
        </span>
      </div>
      <div className="text-xs text-gray-600">
        Select element type to begin:
      </div>
      {renderTypeSelect(element, element.metadata?.type)}
    </>
  );

  return (
    <>
      <div className="p-2 border-b bg-gray-50 space-y-2">
        <PanelLaunchBar
          studies={studies}
          advisorFocus={isElement ? lucidAdvisorFocus(currentElement) : undefined}
          trailing={devToolsButton}
        />
        {isElement && currentElement && (currentElement.isUnconverted
          ? renderUnconverted(currentElement)
          : <div className="flex items-center gap-2">{renderTypeSelect(currentElement, elementType)}</div>)}
      </div>
      <DevToolsModal
        isOpen={devToolsModalOpen}
        onClose={() => setDevToolsModalOpen(false)}
      />
    </>
  );
};
