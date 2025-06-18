import React, { useEffect } from "react";
import { useMessaging } from "src/messaging";
import AuthPanel from "./contentDockPanel/AuthPanel";
import { ModelPanel } from "./modelPanel";
import DebugPanel from "./debugging/DebugPanel";

// Create component-specific logger using our debug service
import { debugService } from "../messaging/utils/debugService";
const logger = debugService.forComponent("LucidAppNew");

interface LucidAppProps {
  panelType?: "auth" | "model";
}

/**
 * LucidApp component that serves as the main container for the application.
 * Can render either the auth panel or the model panel based on the panelType prop.
 */
export const LucidApp: React.FC<LucidAppProps> = ({ panelType = "model" }) => {
  
  // Only show debug features in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Track when the component mounts (only in development)
  useEffect(() => {
    if (isDevelopment) {
      logger.log(`LucidAppNew initialized with panel type: ${panelType}`);
      return () => logger.log("LucidApp unmounted");
    }
  }, [panelType, isDevelopment]);


  // Show different content based on panel type
  if (panelType === "auth") {
    return (
      <div className="lucid-app">
        <AuthPanel />
      </div>
    );
  }

  // Get messaging state to force re-render on document context changes
  const { selection } = useMessaging();
  const documentKey = `${selection.documentContext?.documentId}-${selection.documentContext?.isQuodsiModel}`;
  
  // Model panel content
  return (
    <div className="lucid-app h-full flex flex-col">
      <div className="flex-1">
        <ModelPanel key={documentKey} />
      </div>

      {/* Debug controls at bottom (development only) */}
      {/* isDevelopment && <DebugPanel panelType={panelType} />*/}
    </div>
  );
};

export default LucidApp;
