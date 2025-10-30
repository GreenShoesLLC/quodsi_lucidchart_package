import React from "react";
import { MessageProvider } from "./messaging/MessageProvider";
import "./App.css";
import LucidApp from "./features/LucidApp";

interface AppProps {
  panelType?: "model";
}

export const App: React.FC<AppProps> = ({ panelType }) => {
  // Always use model panel (auth has been removed)
  const currentPanelType: "model" = "model";

  return (
    <MessageProvider initialPanelType={currentPanelType}>
      <div className="app-new-container">
        <LucidApp panelType={currentPanelType} />
      </div>
    </MessageProvider>
  );
};

export default App;
