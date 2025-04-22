// refactored_app.tsx
import React, { useState, useEffect } from "react";
import { AuthProvider } from "./auth/AuthProvider";
import MsalInitializer from "./auth/components/MsalInitializer";
import { createMsalInstance } from "./auth/msalSetup";
import { ModelProvider } from "./contexts/ModelContext";
import { SimulationProvider } from "./contexts/SimulationContext";
import { UIProvider, useUI } from "./contexts/UIContext";
import { AuthPanel } from "./components/auth/AuthPanel";
import { RefactoredApp } from "./components/RefactoredApp";
import {
  MessageTypes,
  ExtensionMessaging,
  isValidMessage,
} from "@quodsi/shared";

/**
 * Content component that handles messaging and panel type switching
 */
const AppContent: React.FC = () => {
  const [panelType, setPanelType] = useState<"auth" | "model" | null>(
    window.location.pathname.includes("auth") ? "auth" : null
  );
  const uiContext = useUI();

  // Set up message handlers for panel switching
  useEffect(() => {
    console.log(
      "[RefactoredApp] Setting up message handlers for panel switching"
    );
    const messaging = ExtensionMessaging.getInstance();

    // Handle AUTH_PANEL_INIT message
    const handleAuthPanelInit = (data: any) => {
      console.log("[RefactoredApp] Received AUTH_PANEL_INIT:", data);
      setPanelType(data.panelType);

      // Also update UI context if available
      if (uiContext) {
        uiContext.dispatch({ type: "SET_PANEL_TYPE", payload: data.panelType });
      }
    };

    // Register the handler
    messaging.onMessage(MessageTypes.AUTH_PANEL_INIT, handleAuthPanelInit);

    // Handle window messages
    const handleWindowMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!isValidMessage(message)) {
        return;
      }
      messaging.handleIncomingMessage(message);
    };

    window.addEventListener("message", handleWindowMessage);

    // Cleanup
    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, [uiContext]);

  // Render the appropriate component based on panel type
  if (panelType === "auth") {
    return <AuthPanel />;
  }

  return <RefactoredApp />;
};

/**
 * Standalone entry point for the refactored app version
 */
const RefactoredAppEntry: React.FC = () => {
  const msalInstance = createMsalInstance();

  return (
    <MsalInitializer msalInstance={msalInstance}>
      <AuthProvider msalInstance={msalInstance}>
        <UIProvider>
          <ModelProvider>
            <SimulationProvider>
              <AppContent />
            </SimulationProvider>
          </ModelProvider>
        </UIProvider>
      </AuthProvider>
    </MsalInitializer>
  );
};

export default RefactoredAppEntry;
