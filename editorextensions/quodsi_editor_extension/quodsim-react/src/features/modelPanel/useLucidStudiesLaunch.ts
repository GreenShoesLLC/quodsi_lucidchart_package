import type { StudiesLaunchButtonProps } from "quodsi_studio/platforms/shared";
import { useSimulationRunSender } from "../../messaging/senders/simulationRunSender";
import { useMessaging } from "../../messaging/MessageProvider";
import { useAuth } from "../../messaging/MessageContext";
import { useValidationState } from "../../messaging/hooks/useValidationState";

/**
 * What LucidChart feeds the shared What-if launcher (spec 2026-09-15 §4) in
 * the panel's shared PanelLaunchBar. Sign-in comes from the auth context (Lucid
 * has no loading state), the blocker count from the extension's live
 * validation result (ERROR-level issues would fail the engine precheck
 * anyway), and opening asks the host to open the embedded-Studio studies
 * modal for this document and page.
 */
export function useLucidStudiesLaunch(): StudiesLaunchButtonProps {
  const { openStudiesModal } = useSimulationRunSender();
  const { selection } = useMessaging();
  const auth = useAuth();
  const validation = useValidationState();
  const documentId = selection.documentContext?.documentId ?? "";
  const pageId = selection.documentContext?.pageId ?? "";

  return {
    variant: "full",
    authStatus: auth.isAuthenticated ? "signed-in" : "signed-out",
    blockerCount: validation.errorCount,
    onOpen: () => openStudiesModal(documentId, pageId),
  };
}
