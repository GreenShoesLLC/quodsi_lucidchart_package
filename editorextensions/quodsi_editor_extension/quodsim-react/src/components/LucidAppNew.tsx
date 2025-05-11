import React, { useEffect, useState } from "react";
import { EnvelopeMessageType } from "@quodsi/shared";
import { useMessaging } from "src/messaging";
import AuthPanel from "./auth/AuthPanel";
import { ModelPanel } from "../features/modelPanel";
import MessageDebugger from "./debugging/MessageDebugger";
import StateInspector from "./debugging/StateInspector";

// Create component-specific logger using our debug service
import { debugService } from "../messaging/utils/debugService";
const logger = debugService.forComponent('LucidAppNew');

interface LucidAppProps {
  panelType?: "auth" | "model";
}

/**
 * LucidApp component that serves as the main container for the application.
 * Can render either the auth panel or the model panel based on the panelType prop.
 */
export const LucidAppNew: React.FC<LucidAppProps> = ({ 
  panelType = "model"
}) => {
  const { auth, app, sendMessage } = useMessaging();
  const [lastMessageSent, setLastMessageSent] = useState<string | null>(null);
  const [lastMessageReceived, setLastMessageReceived] = useState<string | null>(null);
  const [showDebugTools, setShowDebugTools] = useState<boolean>(false);

  // Track when the component mounts
  useEffect(() => {
    logger.log(`LucidAppNew initialized with panel type: ${panelType}`);
    return () => logger.log('LucidAppNew unmounted');
  }, [panelType]);

  // Handle test message sending
  const handleTestMessage = () => {
    sendMessage(EnvelopeMessageType.LOG, {
      level: "info",
      text: `Test message from ${panelType} panel`,
    });
    setLastMessageSent(EnvelopeMessageType.LOG);
  };

  // Toggle debug tools visibility
  const toggleDebugTools = () => {
    setShowDebugTools(prev => !prev);
  };

  // Show different content based on panel type
  if (panelType === "auth") {
    return (
      <div className="lucid-app">
        <div className="new-messaging-header bg-amber-300 mb-2 p-1 text-center font-bold">
          Quodsi Modeling Tool
        </div>
        <AuthPanel />
      </div>
    );
  }

  // Model panel content
  return (
    <div className="lucid-app">
      <div className="new-messaging-header">
        Quodsi Modeling Tool
      </div>
      
      <div className="h-full flex flex-col">
        <div className="flex-none p-3 bg-gray-100 border-b flex justify-between items-center">
          <div className="text-sm">
            <span className="mr-4 inline-flex items-center">
               Auth: <strong className={`ml-1.5 ${auth.isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                {auth.isAuthenticated ? "Authenticated" : "Not Authenticated"}
              </strong>
            </span>
            <span className="inline-flex items-center">
              Initialized: <strong className="ml-1.5">{app.initialized ? "Yes" : "No"}</strong>
            </span>
          </div>
          <button 
            onClick={toggleDebugTools}
            className="text-xs px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors shadow-sm border border-gray-300"
          >
            {showDebugTools ? 'Hide Debug Tools' : 'Show Debug Tools'}
          </button>
        </div>
        
        <div className="flex-1 overflow-auto bg-white shadow-md rounded-md border border-gray-200 mx-2 relative">
          <ModelPanel />
        </div>
        
        {/* Debug tools - conditionally shown */}
        {showDebugTools && (
          <div className="debug-tools mt-4 border-t p-4">
            <div className="message-status mb-4">
              <h3 className="text-sm font-bold">Message Status</h3>
              <p className="text-xs">
                Last message sent: <code>{lastMessageSent || "None"}</code>
              </p>
              <p className="text-xs">
                Last message received: <code>{lastMessageReceived || "None"}</code>
              </p>
              <button 
                onClick={handleTestMessage}
                className="text-xs px-2 py-1 bg-blue-500 text-white rounded mt-2"
              >
                Send Test Message
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-bold">State Inspector</h3>
                <StateInspector />
              </div>
              <div>
                <h3 className="text-sm font-bold">Message Debugger</h3>
                <MessageDebugger />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LucidAppNew;
