import React, { useEffect, useState } from "react";
import { EnvelopeMessageType } from "@quodsi/shared";
import { useMessaging } from "src/messaging";
import AuthPanel from "./auth/AuthPanel";
import MessageDebugger from "./debugging/MessageDebugger";
import StateInspector from "./debugging/StateInspector";

// Create component-specific logger using our debug service
import { debugService } from "../messaging/utils/debugService";
const logger = debugService.forComponent('LucidApp');

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

  // useEffect(() => {
  //   // Log app initialization
  //   logger.log(`LucidApp initialized with panel type: ${panelType}`);

  //   // The REACT_APP_READY message is now sent by MessageProvider automatically
  //   // This is just to record it for our UI
  //   setLastMessageSent(EnvelopeMessageType.REACT_APP_READY);
    
  //   // For the model panel only: Set up periodic auth status check
  //   if (panelType === 'model') {
  //     logger.log('Setting up periodic auth status check for model panel');
      
  //     // Check auth status every 5 seconds when not authenticated
  //     const authCheckInterval = setInterval(() => {
  //       if (!auth.isAuthenticated) {
  //         // First check localStorage as a fallback for cross-panel communication
  //         try {
  //           const storedAuthStatus = localStorage.getItem('quodsi_auth_status');
  //           const storedAuthTimestamp = localStorage.getItem('quodsi_auth_timestamp');
            
  //           if (storedAuthStatus === 'true' && storedAuthTimestamp) {
  //             const timestamp = parseInt(storedAuthTimestamp, 10);
  //             const now = Date.now();
              
  //             // If localStorage indicates authentication within last 30 seconds
  //             if (now - timestamp < 30000) {
  //               logger.log('Detected auth in localStorage, requesting refresh');
  //               console.log('[REACT][LucidApp] Detected authentication in localStorage, requesting refresh');
  //               sendMessage(EnvelopeMessageType.REQUEST_AUTH_STATUS, {});
  //             }
  //           }
  //         } catch (e) {
  //           // Ignore localStorage errors
  //         }
          
  //         // Also periodically request auth status directly
  //         logger.log('Requesting auth status update from host');
  //         sendMessage(EnvelopeMessageType.REQUEST_AUTH_STATUS, {});
  //       }
  //     }, 5000); // Check every 5 seconds
      
  //     // Clean up interval on unmount
  //     return () => clearInterval(authCheckInterval);
  //   }
  // }, [panelType, auth.isAuthenticated, sendMessage]);

  // useEffect(() => {
  //   if (auth.lastUpdated) {
  //     logger.log(`Auth state updated in ${panelType} panel:`, {
  //       isAuthenticated: auth.isAuthenticated,
  //       hasUserInfo: !!auth.userInfo,
  //       lastUpdated: new Date(auth.lastUpdated).toLocaleTimeString()
  //     });
      
  //     // Add a visual indicator for auth changes to make them more obvious
  //     const authIndicator = document.getElementById('auth-update-indicator');
  //     if (!authIndicator) {
  //       // Create a floating indicator element if it doesn't exist
  //       const indicator = document.createElement('div');
  //       indicator.id = 'auth-update-indicator';
  //       indicator.style.position = 'fixed';
  //       indicator.style.top = '10px';
  //       indicator.style.right = '10px';
  //       indicator.style.padding = '8px 16px';
  //       indicator.style.backgroundColor = auth.isAuthenticated ? '#4CAF50' : '#F44336';
  //       indicator.style.color = 'white';
  //       indicator.style.borderRadius = '4px';
  //       indicator.style.zIndex = '9999';
  //       indicator.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  //       indicator.style.transition = 'opacity 0.5s';
  //       indicator.style.opacity = '1';
  //       indicator.textContent = auth.isAuthenticated 
  //         ? `✓ Authenticated in ${panelType} panel` 
  //         : `✗ Not authenticated in ${panelType} panel`;
        
  //       document.body.appendChild(indicator);
        
  //       // Fade out after 3 seconds
  //       setTimeout(() => {
  //         indicator.style.opacity = '0';
  //         // Remove after fade out
  //         setTimeout(() => {
  //           if (indicator.parentNode) {
  //             indicator.parentNode.removeChild(indicator);
  //           }
  //         }, 500);
  //       }, 3000);
  //     }
  //   }
  // }, [auth.lastUpdated, auth.isAuthenticated, panelType]);

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
        <strong 
            style={{
                color: auth.isAuthenticated ? '#4CAF50' : '#F44336',
              fontWeight: 'bold'
            }}
          >
            {auth.isAuthenticated ? "Yes" : "No"}
          </strong>
        </span>
        {auth.lastUpdated && (
          <span>
            Auth Last Updated: <strong>{new Date(auth.lastUpdated).toLocaleTimeString()}</strong>
          </span>
        )}
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
          <button 
            onClick={() => {
              // Manually check and display auth status
              const authState = auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated';
              const indicator = document.createElement('div');
              indicator.style.position = 'fixed';
              indicator.style.top = '80px';
              indicator.style.left = '10px';
              indicator.style.padding = '8px 16px';
              indicator.style.backgroundColor = '#2196F3';
              indicator.style.color = 'white';
              indicator.style.zIndex = '9999';
              indicator.style.borderRadius = '4px';
              indicator.style.fontSize = '12px';
              indicator.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
              indicator.textContent = `Current Auth State: ${authState} in ${panelType} panel`;
              document.body.appendChild(indicator);
              setTimeout(() => {
                if (indicator.parentNode) {
                  indicator.parentNode.removeChild(indicator);
                }
              }, 5000);
            }}
            style={{
              marginLeft: '10px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Check Auth Status
          </button>
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
