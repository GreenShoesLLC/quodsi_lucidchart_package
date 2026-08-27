import React from "react";
import { PlaySquare } from "lucide-react";
import { useSimulationRunSender } from "../../messaging/senders/simulationRunSender";
import { useMessaging } from "../../messaging/MessageProvider";
import { useAuth } from "../../messaging/MessageContext";
import { useValidationState } from "../../messaging/hooks/useValidationState";

/**
 * Primary action button that launches the embedded-Studio studies modal.
 *
 * This lives in the model PanelHeader and replaces the old labeled "Scenarios"
 * entry that sat awkwardly among the icon-only ModelEditor tabs. The tabs switch
 * inline content; launching the studies modal is a different interaction, so it
 * reads better as a dedicated header call-to-action than as a pseudo-tab.
 *
 * Rendered by PanelHeader as the entry point for the embedded-Studio studies modal.
 *
 * Exported for unit testing.
 */
export function StudiesLaunchButton() {
  const { openStudiesModal } = useSimulationRunSender();
  const { selection } = useMessaging();
  const auth = useAuth();
  // Live host validation (MODEL_VALIDATION_RESULT). ERROR-level issues mean
  // the engine precheck would reject the run anyway, so the launch is gated
  // here with the count, pointing at the Validation tab (smoke 2026-08-27).
  const validation = useValidationState();
  const blocked = validation.hasErrors;
  const documentId = selection.documentContext?.documentId ?? "";
  const pageId = selection.documentContext?.pageId ?? "";
  const title = !auth.isAuthenticated
    ? "Sign in to use Studies"
    : blocked
      ? `Fix ${validation.errorCount} validation error${validation.errorCount === 1 ? "" : "s"} before opening Studies — see the Validation tab`
      : "Open the studies editor";

  return (
    <button
      type="button"
      data-testid="open-studies-modal"
      title={title}
      disabled={!auth.isAuthenticated || blocked}
      onClick={() => openStudiesModal(documentId, pageId)}
      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <PlaySquare className="w-4 h-4" />
      Studies
    </button>
  );
}
