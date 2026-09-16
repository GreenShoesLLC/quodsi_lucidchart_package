import React from "react";
import { MessageProvider } from "./messaging/MessageProvider";
import "./App.css";
import LucidApp from "./features/LucidApp";
import { PatternEditorView } from "./features/pattern/PatternEditorView";
import { ScheduleEditorView } from "./features/schedule/ScheduleEditorView";
import { WorkScheduleEditorView } from "./features/workSchedule/WorkScheduleEditorView";
import { SettingsEditorView } from "./features/settings/SettingsEditorView";
import { DiagramMappingView } from "./features/diagramMapping/DiagramMappingView";

// Lazy: the compiled Studio surfaces stay out of the panel's entry chunk.
const StudiesModalView = React.lazy(() => import("./features/studies/StudiesModalView").then((m) => ({ default: m.StudiesModalView })));
const AdvisorModalView = React.lazy(() => import("./features/studies/AdvisorModalView").then((m) => ({ default: m.AdvisorModalView })));

export const App: React.FC = () => {
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

  if (urlParams.get("view") === "settings") {
    return (
      <MessageProvider initialPanelType="settings">
        <div className="h-full w-full">
          <SettingsEditorView />
        </div>
      </MessageProvider>
    );
  }

  if (urlParams.get("view") === "diagram-mapping") {
    return (
      <MessageProvider initialPanelType="diagram-mapping">
        <div className="h-full w-full">
          <DiagramMappingView />
        </div>
      </MessageProvider>
    );
  }

  // Compiled Studies / Advisor modals keep the studio-embed channel role.
  if (urlParams.get("view") === "studies" || urlParams.get("view") === "advisor") {
    const View = urlParams.get("view") === "studies" ? StudiesModalView : AdvisorModalView;
    return (
      <MessageProvider initialPanelType="studio-embed">
        <div className="h-full w-full">
          <React.Suspense fallback={null}><View /></React.Suspense>
        </div>
      </MessageProvider>
    );
  }

  // Default: model panel in right dock
  const currentPanelType: "model" = "model";

  return (
    <MessageProvider initialPanelType={currentPanelType}>
      <div className="app-new-container">
        <LucidApp />
      </div>
    </MessageProvider>
  );
};

export default App;
