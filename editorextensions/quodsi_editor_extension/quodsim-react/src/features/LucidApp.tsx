import React, { useEffect } from "react";
import { useMessaging } from "../messaging";
import { ModelPanel } from "./modelPanel";

// Create component-specific logger using the shared logger
import { getLogger } from "@quodsi/lucid-shared";
const logger = getLogger("LucidAppNew");

interface LucidAppProps {
  panelType?: "model";
}

/**
 * LucidApp component that serves as the main container for the application.
 */
export const LucidApp: React.FC<LucidAppProps> = ({ panelType = "model" }) => {

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
  const { selection } = useMessaging();
  const documentKey = `${selection.documentContext?.documentId}-${selection.documentContext?.isQuodsiModel}`;

  // Model panel content
  return (
    <div className="lucid-app h-full flex flex-col">
      <div className="flex-1">
        <ModelPanel key={documentKey} />
      </div>
    </div>
  );
};

export default LucidApp;
