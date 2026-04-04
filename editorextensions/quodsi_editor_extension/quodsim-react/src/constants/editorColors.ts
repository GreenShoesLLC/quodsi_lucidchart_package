import { SimulationObjectType } from "@quodsi/shared";

/**
 * Accent colors for each editor type, used for the PanelHeader left border stripe.
 * Values are Tailwind border-color classes.
 */
export const EDITOR_ACCENT_COLORS: Record<string, string> = {
  [SimulationObjectType.Model]: "border-blue-500",
  [SimulationObjectType.Activity]: "border-amber-500",
  [SimulationObjectType.Generator]: "border-purple-500",
  [SimulationObjectType.Resource]: "border-green-500",
  [SimulationObjectType.Entity]: "border-cyan-500",
  [SimulationObjectType.Connector]: "border-gray-400",
};

/**
 * Icon text colors matching the accent stripe, used for the PanelHeader icon.
 * Values are Tailwind text-color classes.
 */
export const EDITOR_ICON_COLORS: Record<string, string> = {
  [SimulationObjectType.Model]: "text-blue-500",
  [SimulationObjectType.Activity]: "text-amber-500",
  [SimulationObjectType.Generator]: "text-purple-500",
  [SimulationObjectType.Resource]: "text-green-500",
  [SimulationObjectType.Entity]: "text-cyan-500",
  [SimulationObjectType.Connector]: "text-gray-400",
};

/**
 * Returns the Tailwind border-color class for a given editor type.
 * Falls back to transparent if the type is unknown.
 */
export function getEditorAccentClass(editorType: string | SimulationObjectType): string {
  return EDITOR_ACCENT_COLORS[editorType] || "border-transparent";
}

/**
 * Returns the Tailwind text-color class for the header icon.
 * Falls back to gray-500 if the type is unknown.
 */
export function getEditorIconClass(editorType: string | SimulationObjectType): string {
  return EDITOR_ICON_COLORS[editorType] || "text-gray-500";
}
