import React from "react";
import { MessageProvider } from "./messaging/MessageProvider";
import "./App.css";
import LucidApp from "./features/LucidApp";
import ModalResultsView from "./features/ModalResultsView";
import { EmbeddedStudioFrame } from "./features/embed/EmbeddedStudioFrame";

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

  if (urlParams.get("view") === "studio-results") {
    const scenarioId = urlParams.get("scenarioId") || "";
    // Fix #3b: guard against a missing scenarioId which would produce a broken
    // URL like `/embed/scenarios//results`.
    if (!scenarioId) {
      return (
        <MessageProvider initialPanelType="studio-results">
          <div className="h-full w-full flex items-center justify-center">
            <p style={{ textAlign: "center", padding: 16 }}>Missing scenarioId.</p>
          </div>
        </MessageProvider>
      );
    }
    return (
      <MessageProvider initialPanelType="studio-results">
        <div className="h-full w-full">
          <EmbeddedStudioFrame studioPath={`/embed/scenarios/${scenarioId}/results`} />
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
