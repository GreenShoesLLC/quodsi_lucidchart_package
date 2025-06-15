import React, { useState } from "react";
import { EnvelopeMessageType } from "@quodsi/shared";
import { useMessaging } from "../../messaging";
import MessageDebugger from "./MessageDebugger";
import StateInspector from "./StateInspector";

interface DebugPanelProps {
  panelType?: string;
}

/**
 * DebugPanel component that provides development debugging tools
 * Only shown when NODE_ENV === 'development'
 */
export const DebugPanel: React.FC<DebugPanelProps> = ({ panelType = "model" }) => {
  const { auth, app, sendMessage } = useMessaging();
  const [lastMessageSent, setLastMessageSent] = useState<string | null>(null);
  const [lastMessageReceived, setLastMessageReceived] = useState<string | null>(null);
  const [showDebugTools, setShowDebugTools] = useState<boolean>(false);

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
    setShowDebugTools((prev) => !prev);
  };

  return (
    <div className="mt-auto pt-3 border-t border-gray-200 bg-gray-50">
      <div className="flex justify-between items-center mb-2 px-3">
        <div className="text-xs text-gray-600">
          <span className="mr-4">
            Auth: <strong className={auth.isAuthenticated ? "text-green-600" : "text-red-600"}>
              {auth.isAuthenticated ? "✓" : "✗"}
            </strong>
          </span>
          <span>
            Ready: <strong>{app.initialized ? "✓" : "..."}</strong>
          </span>
        </div>
        <button
          onClick={toggleDebugTools}
          className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
        >
          {showDebugTools ? "Hide Debug" : "Debug"}
        </button>
      </div>
      
      {/* Debug tools panel */}
      {showDebugTools && (
        <div className="debug-tools border-t p-3 bg-gray-50">
          <div className="message-status mb-3">
            <h3 className="text-xs font-semibold text-gray-700 mb-1">Message Status</h3>
            <p className="text-xs text-gray-600">
              Last sent: <code className="bg-gray-200 px-1">{lastMessageSent || "None"}</code>
            </p>
            <p className="text-xs text-gray-600">
              Last received: <code className="bg-gray-200 px-1">{lastMessageReceived || "None"}</code>
            </p>
            <button
              onClick={handleTestMessage}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded mt-2 hover:bg-blue-600"
            >
              Send Test Message
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-1">State Inspector</h3>
              <StateInspector />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-1">Message Debugger</h3>
              <MessageDebugger />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;