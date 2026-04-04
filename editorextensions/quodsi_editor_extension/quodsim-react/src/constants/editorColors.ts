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
 * Returns the Tailwind border-color class for a given editor type.
 * Falls back to transparent if the type is unknown.
 */
export function getEditorAccentClass(editorType: string | SimulationObjectType): string {
  return EDITOR_ACCENT_COLORS[editorType] || "border-transparent";
}
