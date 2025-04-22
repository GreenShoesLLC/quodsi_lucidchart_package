import React, { useState } from 'react';
import { useModel } from '../../contexts/ModelContext';
import { useSimulation } from '../../contexts/SimulationContext';
import { useUI } from '../../contexts/UIContext';
import { useModelOperations } from '../../hooks/useModelOperations';

/**
 * A simple demonstration component that shows how to use the various contexts
 * and hooks created in the refactoring.
 * 
 * This can be embedded anywhere in the application for testing purposes.
 */
export const ContextDemo: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Get contexts (may be undefined if not wrapped with providers)
  const modelContext = useModel();
  const simulationContext = useSimulation();
  const uiContext = useUI();
  
  // Use our standalone hooks
  const modelOps = useModelOperations();
  
  // Status indicators for each context
  const modelStatus = modelContext ? 'Available' : 'Not Available';
  const simulationStatus = simulationContext ? 'Available' : 'Not Available';
  const uiStatus = uiContext ? 'Available' : 'Not Available';
  
  return (
    <div className="p-4 m-2 border rounded bg-white">
      <h2 className="text-lg font-bold mb-2">Context Demo Component</h2>
      
      <div className="mb-4">
        <p><strong>Context Status:</strong></p>
        <ul className="list-disc pl-5">
          <li>Model Context: <span className={modelContext ? 'text-green-600' : 'text-red-600'}>{modelStatus}</span></li>
          <li>Simulation Context: <span className={simulationContext ? 'text-green-600' : 'text-red-600'}>{simulationStatus}</span></li>
          <li>UI Context: <span className={uiContext ? 'text-green-600' : 'text-red-600'}>{uiStatus}</span></li>
        </ul>
      </div>
      
      <div className="mb-4">
        <p><strong>Test Actions:</strong></p>
        <div className="flex space-x-2 mt-2">
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => modelOps.validateModel()}
          >
            Validate Model
          </button>
          
          {modelContext && (
            <button
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={() => modelContext.validateModel()}
            >
              Validate (Context)
            </button>
          )}
          
          {uiContext && (
            <button
              className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
              onClick={() => uiContext.setError('Test error message')}
            >
              Show Test Error
            </button>
          )}
          
          {uiContext && (
            <button
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              onClick={() => uiContext.setError(null)}
            >
              Clear Error
            </button>
          )}
        </div>
      </div>
      
      <div>
        <button
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
        
        {showDetails && modelContext && (
          <div className="mt-4 p-3 bg-gray-50 rounded overflow-auto max-h-60">
            <p className="font-bold">Model State:</p>
            <pre className="text-xs">
              {JSON.stringify({
                modelName: modelContext.state.modelName,
                documentId: modelContext.state.documentId,
                hasCurrentElement: !!modelContext.state.currentElement,
                expandedNodesCount: modelContext.state.expandedNodes.size,
              }, null, 2)}
            </pre>
          </div>
        )}
        
        {showDetails && simulationContext && (
          <div className="mt-4 p-3 bg-gray-50 rounded overflow-auto max-h-60">
            <p className="font-bold">Simulation State:</p>
            <pre className="text-xs">
              {JSON.stringify({
                documentId: simulationContext.state.documentId,
                isPolling: simulationContext.state.simulationStatus.isPollingSimState,
                newResults: simulationContext.state.simulationStatus.newResultsAvailable,
              }, null, 2)}
            </pre>
          </div>
        )}
        
        {showDetails && uiContext && (
          <div className="mt-4 p-3 bg-gray-50 rounded overflow-auto max-h-60">
            <p className="font-bold">UI State:</p>
            <pre className="text-xs">
              {JSON.stringify({
                panelType: uiContext.state.panelType,
                isProcessing: uiContext.state.isProcessing,
                error: uiContext.state.error,
                visibleSections: uiContext.state.visibleSections,
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
