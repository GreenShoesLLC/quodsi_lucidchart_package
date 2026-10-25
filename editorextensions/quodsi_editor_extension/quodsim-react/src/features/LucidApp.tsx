import React, { useEffect } from "react";
import { useMessaging } from "../messaging";
import { ModelPanel } from "./modelPanel";
import { PanelTourHost } from "./onboarding/PanelTourHost";
import { MenuCommandHost } from "./menu/MenuCommandHost";
import { anchorProps, ClientOutdatedNotice } from "quodsi_studio/platforms/shared";

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
  // so Convert (which flips isQuodsiModel) does not tear the tour down.
  // Mounted ALWAYS, even before auth resolves: on a cold panel open the
  // extension flushes the queued TOUR_START ("Take the Quodsi tour") on
  // REACT_APP_READY, before its AUTH_STATUS broadcast, so the host must be
  // listening already and buffer the start until the user is known. The auth
  // slice cannot tell "not yet known" from "signed out", so anything short of
  // a signed-in user with an email is 'loading' (a buffered start is then
  // honoured whenever sign-in arrives).
  const userKey = auth?.user?.email ?? "";
  const tourAuthStatus = auth?.isAuthenticated && userKey ? "signed-in" : "loading";
  const tourHost = (
    <PanelTourHost
      userKey={userKey}
      authStatus={tourAuthStatus}
      isConverted={selection.documentContext?.isQuodsiModel === true}
      currentPageId={selection.documentContext?.pageId}
      documentId={selection.documentContext?.documentId}
    />
  );

  // Model panel content
  return (
    <div className="lucid-app h-full flex flex-col" {...anchorProps("panel.root")}>
      {tourHost}
      <div className="flex-1 min-h-0">
        <ModelPanel key={documentKey} />
      </div>
      {/* Spec 2026-10-21 quodsi-version, Part C: the API refused this package. */}
      <ClientOutdatedNotice />
      {/* The extension Quodsi menu's Remove / Diagram Mapping items. */}
      <MenuCommandHost />
    </div>
  );
};

export default LucidApp;
