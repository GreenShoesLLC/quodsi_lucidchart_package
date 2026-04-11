import React from "react";
import SimulationRunAnalysisDashboard from "./editors/analysis/SimulationRunAnalysisDashboard";

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
      />
    </div>
  );
};

export default ModalResultsView;
