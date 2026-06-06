import React from "react";
import { PlaySquare } from "lucide-react";
import { useSimulationRunSender } from "../../messaging/senders/simulationRunSender";
import { useMessaging } from "../../messaging/MessageProvider";

/**
 * Primary action button that launches the embedded-Studio scenarios modal.
 *
 * This lives in the model PanelHeader and replaces the old labeled "Scenarios"
 * entry that sat awkwardly among the icon-only ModelEditor tabs. The tabs switch
 * inline content; launching the scenarios modal is a different interaction, so it
 * reads better as a dedicated header call-to-action than as a pseudo-tab.
 *
 * Rendered by PanelHeader only when SCENARIOS_DB_AUTHORITATIVE is enabled (the
 * gate lives at the call site so this component's hooks are never invoked while
 * the flag is off). When the flag is off, the legacy in-panel Scenarios tab
 * remains the entry point.
 *
 * Exported for unit testing.
 */
export function ScenariosLaunchButton() {
  const { openScenariosModal } = useSimulationRunSender();
  const { selection } = useMessaging();
  const documentId = selection.documentContext?.documentId ?? "";
  const pageId = selection.documentContext?.pageId ?? "";

  return (
    <button
      type="button"
      data-testid="open-scenarios-modal"
      title="Open the scenarios editor"
      onClick={() => openScenariosModal(documentId, pageId)}
      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
    >
      <PlaySquare className="w-4 h-4" />
      Scenarios
    </button>
  );
}
