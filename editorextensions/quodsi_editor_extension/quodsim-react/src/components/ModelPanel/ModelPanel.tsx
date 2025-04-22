import React from "react";
import { ModelPanelAccordion } from "../ModelPanelAccordion/ModelPanelAccordion";
import { ProcessingIndicator } from "../ui/ProcessingIndicator";
import { useModel } from "../../contexts/ModelContext";
import { useSimulation } from "../../contexts/SimulationContext";
import { useUI } from "../../contexts/UIContext";

/**
 * ModelPanel component that serves as the main authenticated view.
 * Uses contexts for state management instead of props.
 * 
 * This component doesn't modify the existing QuodsiApp.tsx flow but can be used
 * in parallel with it for testing purposes.
 */
export const ModelPanel: React.FC = () => {
  // Get state and handlers from contexts
  // Each context might be undefined during testing/development
  const modelContext = useModel();
  const simulationContext = useSimulation();
  const uiContext = useUI();
  
  // If contexts aren't available, show a message
  if (!modelContext || !simulationContext || !uiContext) {
    return (
      <div className="p-4">
        <p>Model Panel - Contexts not available</p>
      </div>
    );
  }
  
  // Extract state and functions from contexts
  const {
    state: modelState,
    selectElement,
    updateElement,
    validateModel,
    toggleTreeNode,
    expandPath,
    convertElementType,
    removeModel,
    convertPage
  } = modelContext;
  
  const {
    state: simulationState,
    startSimulation,
    viewResults
  } = simulationContext;
  
  const { state: uiState } = uiContext;
  
  // Extract relevant data from model state
  const {
    modelStructure,
    modelName,
    validationState,
    currentElement,
    lastElementUpdate,
    diagramElementType,
    expandedNodes,
    referenceData
  } = modelState;
  
  // Helper for tree state updates (expanded nodes)
  const handleTreeStateUpdate = (nodes: string[]) => {
    // Convert array to Set and update context
    const nodesSet = new Set(nodes);
    modelContext.dispatch({ type: 'SET_EXPANDED_NODES', payload: nodesSet });
  };
  
  // Return processing indicator when processing
  if (uiState.isProcessing) {
    return <ProcessingIndicator />;
  }
  
  // Return the ModelPanelAccordion with data and handlers from contexts
  return (
    <ModelPanelAccordion
      modelStructure={modelStructure}
      modelName={modelName}
      validationState={validationState}
      currentElement={currentElement}
      lastElementUpdate={lastElementUpdate}
      diagramElementType={diagramElementType}
      expandedNodes={expandedNodes}
      onElementSelect={selectElement}
      onValidate={validateModel}
      onElementUpdate={updateElement}
      onTreeNodeToggle={toggleTreeNode}
      onTreeStateUpdate={handleTreeStateUpdate}
      onExpandPath={expandPath}
      referenceData={referenceData}
      showModelName={uiState.showModelName}
      showModelItemName={uiState.showModelItemName}
      visibleSections={uiState.visibleSections}
      onSimulate={startSimulation}
      onRemoveModel={removeModel}
      onConvertPage={convertPage}
      onElementTypeChange={convertElementType}
      simulationStatus={simulationState.simulationStatus}
      onViewResults={viewResults}
    />
  );
};
