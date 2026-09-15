import React from "react";
import { StudiesLaunchButton as SharedStudiesLaunchButton } from "quodsi_studio/platforms/shared";
import { useSimulationRunSender } from "../../messaging/senders/simulationRunSender";
import { useMessaging } from "../../messaging/MessageProvider";
import { useAuth } from "../../messaging/MessageContext";
import { useValidationState } from "../../messaging/hooks/useValidationState";

/**
 * LucidChart's host for the shared Studies launch button (spec 2026-09-15 §4),
 * in the model PanelHeader. Sign-in comes from the auth context (Lucid has no
 * loading state), the blocker count from the extension's live validation
 * result (ERROR-level issues would fail the engine precheck anyway), and a
 * click asks the host to open the embedded-Studio studies modal for this
 * document and page.
 *
 * Exported for unit testing.
 */
export function StudiesLaunchButton() {
  const { openStudiesModal } = useSimulationRunSender();
  const { selection } = useMessaging();
  const auth = useAuth();
  const validation = useValidationState();
  const documentId = selection.documentContext?.documentId ?? "";
  const pageId = selection.documentContext?.pageId ?? "";

  return (
    <SharedStudiesLaunchButton
      variant="full"
      authStatus={auth.isAuthenticated ? "signed-in" : "signed-out"}
      blockerCount={validation.errorCount}
      onOpen={() => openStudiesModal(documentId, pageId)}
    />
  );
}
