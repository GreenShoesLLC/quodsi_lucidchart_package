import React from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { MessageProvider } from "./messaging/MessageProvider";

import { msalConfig } from "./config/msalConfig";
import "./App.css";
import LucidApp from "./features/LucidApp";

// Create the MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

interface AppProps {
  panelType?: "auth" | "model";
}

export const App: React.FC<AppProps> = ({ panelType }) => {
  // Determine panel type from URL if not provided as prop
  const determinePanelType = (): "auth" | "model" => {
    if (panelType) return panelType;

    // Try to determine from URL
    const urlParams = new URLSearchParams(window.location.search);
    const panelParam = urlParams.get("panel");

    if (panelParam === "auth") return "auth";
    if (window.location.pathname.includes("auth")) return "auth";

    // Default to model panel
    return "model";
  };

  const currentPanelType = determinePanelType();

  return (
    <MsalProvider instance={msalInstance}>
      <MessageProvider initialPanelType={currentPanelType}>
        <div className="app-new-container">
          <LucidApp panelType={currentPanelType} />
        </div>
      </MessageProvider>
    </MsalProvider>
  );
};

export default App;
