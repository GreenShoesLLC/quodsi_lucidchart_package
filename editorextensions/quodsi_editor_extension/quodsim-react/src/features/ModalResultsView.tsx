import React from "react";
import SimulationRunAnalysisDashboard from "./editors/SimulationRunAnalysisDashboard";

interface ModalResultsViewProps {
  scenarioId: string;
  documentId: string;
}

/**
 * Full-width wrapper for SimulationRunAnalysisDashboard, rendered inside a Lucid modal.
 * The modal provides ~1000x700px of space vs the 300px right dock panel.
 */
const ModalResultsView: React.FC<ModalResultsViewProps> = ({
  scenarioId,
  documentId,
}) => {
  return (
    <div className="h-full w-full bg-white overflow-auto">
      <SimulationRunAnalysisDashboard
        scenarioId={scenarioId}
        documentId={documentId}
        onBackToList={() => {
          // In modal mode, there's no "back to list" — user closes the modal via the X button.
          // This is a no-op placeholder required by the component's interface.
        }}
      />
    </div>
  );
};

export default ModalResultsView;
