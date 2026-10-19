import React, { useEffect } from "react";
import { useMessaging } from "../messaging";
import { ModelPanel } from "./modelPanel";
import { PanelTourHost } from "./onboarding/PanelTourHost";
import { anchorProps } from "quodsi_studio/platforms/shared";

// Create component-specific logger using the shared logger
import { getLogger } from "@quodsi/lucid-shared";
const logger = getLogger("LucidAppNew");

/**
 * LucidApp component that serves as the main container for the application.
 */
export const LucidApp: React.FC = () => {

  // Only show debug features in development
  const isDevelopment = import.meta.env.DEV;

  // Track when the component mounts (only in development)
  useEffect(() => {
    if (isDevelopment) {
      logger.debug(`LucidApp initialized`);
      return () => logger.debug("LucidApp unmounted");
    }
  }, [isDevelopment]);

  // Get messaging state to force re-render on document context changes
  const { selection, auth } = useMessaging();
  const documentKey = `${selection.documentContext?.documentId}-${selection.documentContext?.isQuodsiModel}`;

  // The onboarding tour (spec 2026-10-16): its docked card pins above the
  // panel and the editor shifts down. Outside ModelPanel's documentKey remount
  // so Convert (which flips isQuodsiModel) does not tear the tour down. Tour
  // state is per user, so nothing runs until the user is known.
  const userKey = auth?.user?.email ?? "";
  const tourHost = userKey ? (
    <PanelTourHost
      userKey={userKey}
      authStatus={auth.isAuthenticated ? "signed-in" : "signed-out"}
      isConverted={selection.documentContext?.isQuodsiModel === true}
      currentPageId={selection.documentContext?.pageId}
      documentId={selection.documentContext?.documentId}
    />
  ) : null;

  // Model panel content
  return (
    <div className="lucid-app h-full flex flex-col" {...anchorProps("panel.root")}>
      {tourHost}
      <div className="flex-1 min-h-0">
        <ModelPanel key={documentKey} />
      </div>
    </div>
  );
};

export default LucidApp;
