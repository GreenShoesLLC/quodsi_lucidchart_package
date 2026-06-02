import React from "react";
import { MessageProvider } from "./messaging/MessageProvider";
import "./App.css";
import LucidApp from "./features/LucidApp";
import ModalResultsView from "./features/ModalResultsView";
import { StudioEmbedSpike } from "./spikes/StudioEmbedSpike";

interface AppProps {
  panelType?: "model";
}

export const App: React.FC<AppProps> = ({ panelType }) => {
  // Check if we're in modal results mode (opened via ResultsModal)
  const urlParams = new URLSearchParams(window.location.search);
  const isResultsModal = urlParams.get("view") === "results";

  if (isResultsModal) {
    const scenarioId = urlParams.get("scenarioId") || "";
    const documentId = urlParams.get("documentId") || "";
    return (
      <MessageProvider initialPanelType="results">
        <div className="h-full w-full">
          <ModalResultsView scenarioId={scenarioId} documentId={documentId} />
        </div>
      </MessageProvider>
    );
  }

  if (urlParams.get("view") === "studio-embed-spike") {
    return (
      <MessageProvider initialPanelType="studio-embed-spike">
        <div className="h-full w-full">
          <StudioEmbedSpike />
        </div>
      </MessageProvider>
    );
  }

  // Default: model panel in right dock
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
