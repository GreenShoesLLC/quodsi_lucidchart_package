import React, { useEffect, useState } from "react";
import { EnvelopeMessageType } from "@quodsi/shared";
import { useMessaging } from "src/messaging";
import AuthPanel from "./auth/AuthPanel";
import MessageDebugger from "./debugging/MessageDebugger";
import StateInspector from "./debugging/StateInspector";


interface LucidAppProps {
  panelType?: "auth" | "model";
}

export const LucidApp: React.FC<LucidAppProps> = ({ panelType = "model" }) => {
  const { auth, selection, subscription, simulation, app, sendMessage } =
    useMessaging();
  const [lastMessageSent, setLastMessageSent] = useState<string | null>(null);
  const [lastMessageReceived, setLastMessageReceived] = useState<string | null>(
    null
  );

  useEffect(() => {
    // Log app initialization
    console.log(`LucidApp initialized with panel type: ${panelType}`);

    // The REACT_APP_READY message is now sent by MessageProvider automatically
    // This is just to record it for our UI
    setLastMessageSent(EnvelopeMessageType.REACT_APP_READY);
  }, [panelType]);

  // Track when messages are received by watching state updates
  useEffect(() => {
    setLastMessageReceived("AUTH_STATUS_UPDATE");
  }, [auth.lastUpdated]);

  useEffect(() => {
    setLastMessageReceived("SELECTION_UPDATE");
  }, [selection.lastUpdated]);

  useEffect(() => {
    setLastMessageReceived("SUBSCRIPTION_UPDATE");
  }, [subscription.lastUpdated]);

  useEffect(() => {
    setLastMessageReceived("SIMULATION_STATUS_UPDATE");
  }, [simulation.lastUpdated]);

  const handleTestMessage = () => {
    // Send a test message to the host
    sendMessage(EnvelopeMessageType.LOG, {
      level: "info",
      text: `Test message from ${panelType} panel`,
    });
    setLastMessageSent(EnvelopeMessageType.LOG);
  };

  // Show different content based on panel type
  if (panelType === "auth") {
    return (
      <div className="lucid-app">
        <div className="new-messaging-header bg-amber-300 mb-2 p-1 text-center font-bold">
          New Messaging Implementation
        </div>
        <AuthPanel />
      </div>
    );
  }

  // Model panel content
  return (
    <div className="lucid-app">
      <div className="new-messaging-header bg-amber-300 mb-2 p-1 text-center font-bold">
        New Messaging Implementation
      </div>
      <div className="app-header">
        <h1>Quodsi Model Panel</h1>
        <div className="panel-info">
          <span>
            Panel Type: <strong>{panelType}</strong>
          </span>
          <span>
            Initialized: <strong>{app.initialized ? "Yes" : "No"}</strong>
          </span>
          <span>
            Authenticated:{" "}
            <strong>{auth.isAuthenticated ? "Yes" : "No"}</strong>
          </span>
        </div>
      </div>

      <div className="message-status">
        <div>
          <h3>Message Status</h3>
          <p>
            Last message sent: <code>{lastMessageSent || "None"}</code>
          </p>
          <p>
            Last message received: <code>{lastMessageReceived || "None"}</code>
          </p>
          <button onClick={handleTestMessage}>Send Test Message</button>
        </div>
      </div>

      <div className="panels">
        <div className="panel">
          <h3>Auth State</h3>
          <pre>{JSON.stringify(auth, null, 2)}</pre>
        </div>

        <div className="panel">
          <h3>Selection State</h3>
          <pre>{JSON.stringify(selection, null, 2)}</pre>
        </div>
      </div>

      <div className="panels">
        <div className="panel">
          <h3>Subscription State</h3>
          <pre>{JSON.stringify(subscription, null, 2)}</pre>
        </div>

        <div className="panel">
          <h3>Simulation State</h3>
          <pre>{JSON.stringify(simulation, null, 2)}</pre>
        </div>
      </div>

      {/* Debug tools - will be implemented by StateInspector and MessageDebugger components */}
      <div className="debug-tools">
        <h2>Debug Tools</h2>
        <MessageDebugger />
        <StateInspector />
      </div>
    </div>
  );
};

export default LucidApp;
