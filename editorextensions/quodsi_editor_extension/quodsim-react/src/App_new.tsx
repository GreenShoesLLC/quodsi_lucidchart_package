import React, { useState } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { MessageProvider } from "./messaging/MessageProvider";

import { msalConfig } from "./auth/msalConfig";
import "./App_new.css";
import LucidAppNew from "./components/LucidAppNew";
import { FeatureToggle } from "./features/shared";

// Create the MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

interface AppNewProps {
  panelType?: "auth" | "model";
}

export const App_new: React.FC<AppNewProps> = ({ panelType }) => {
  // State for feature toggle
  const [useNewModelPanel, setUseNewModelPanel] = useState(true);
  
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
          {currentPanelType === "model" && (
            <div className="feature-toggle-container bg-gray-100 p-2 border-b">
              <FeatureToggle
                id="model-panel-toggle"
                label="Use New Model Panel"
                isEnabled={useNewModelPanel}
                onChange={setUseNewModelPanel}
              />
            </div>
          )}
          <LucidAppNew 
            panelType={currentPanelType} 
            useNewModelPanel={useNewModelPanel}
          />
        </div>
      </MessageProvider>
    </MsalProvider>
  );
};

export default App_new;
