import React from "react";
import { MessageProvider } from "./messaging/MessageProvider";
import "./App.css";
import LucidApp from "./features/LucidApp";
import { StudioEmbedView } from "./features/embed/StudioEmbedView";
import { PatternEditorView } from "./features/pattern/PatternEditorView";
import { ScheduleEditorView } from "./features/schedule/ScheduleEditorView";
import { WorkScheduleEditorView } from "./features/schedule/WorkScheduleEditorView";

interface AppProps {
  panelType?: "model";
}

export const App: React.FC<AppProps> = ({ panelType }) => {
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get("view") === "pattern") {
    return (
      <MessageProvider initialPanelType="pattern">
        <div className="h-full w-full">
          <PatternEditorView />
        </div>
      </MessageProvider>
    );
  }

  if (urlParams.get("view") === "schedule") {
    return (
      <MessageProvider initialPanelType="schedule">
        <div className="h-full w-full">
          <ScheduleEditorView />
        </div>
      </MessageProvider>
    );
  }

  if (urlParams.get("view") === "work-schedule") {
    return (
      <MessageProvider initialPanelType="work-schedule">
        <div className="h-full w-full">
          <WorkScheduleEditorView />
        </div>
      </MessageProvider>
    );
  }

  if (urlParams.get("view") === "studio-embed") {
    return (
      <MessageProvider initialPanelType="studio-embed">
        <div className="h-full w-full">
          <StudioEmbedView />
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
