import React, { useEffect } from "react";
import { useMessaging } from "src/messaging";
import { ModelPanel } from "./modelPanel";

// Create component-specific logger using our debug service
import { debugService } from "../messaging/utils/debugService";
const logger = debugService.forComponent("LucidAppNew");

interface LucidAppProps {
  panelType?: "model";
}

/**
 * LucidApp component that serves as the main container for the application.
 */
export const LucidApp: React.FC<LucidAppProps> = ({ panelType = "model" }) => {

  // Only show debug features in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Track when the component mounts (only in development)
  useEffect(() => {
    if (isDevelopment) {
      logger.log(`LucidApp initialized`);
      return () => logger.log("LucidApp unmounted");
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
