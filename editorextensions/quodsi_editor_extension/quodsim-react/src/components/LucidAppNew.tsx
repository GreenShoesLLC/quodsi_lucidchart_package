import React, { useEffect, useState } from "react";
import { EnvelopeMessageType, SimulationObjectType, DiagramElementType } from "@quodsi/shared";
import { useMessaging } from "src/messaging";
import AuthPanel from "./auth/AuthPanel";
import { ModelPanel } from "../features/modelPanel";
import MessageDebugger from "./debugging/MessageDebugger";
import StateInspector from "./debugging/StateInspector";
import { ModelPanelAccordion } from "./ModelPanelAccordion";
import { SimulationStatus } from "../types/SimulationStatus";
import { useModelOpsSender } from "../messaging/senders/modelOpsSender";
import { useSimulationSender } from "../messaging/senders/simulationSender";

// Create component-specific logger using our debug service
import { debugService } from "../messaging/utils/debugService";
const logger = debugService.forComponent('LucidAppNew');

interface LucidAppProps {
  panelType?: "auth" | "model";
  useNewModelPanel?: boolean;
}

/**
 * LucidApp component that serves as the main container for the application.
 * Can render either the auth panel or the model panel based on the panelType prop.
 * Can switch between old and new model panel implementations based on useNewModelPanel prop.
 */
export const LucidAppNew: React.FC<LucidAppProps> = ({ 
  panelType = "model",
  useNewModelPanel = true
}) => {
  const { auth, app, sendMessage, selection, validation, simulation } = useMessaging();
  const modelOpsSender = useModelOpsSender();
  const simulationSender = useSimulationSender();
  
  const [lastMessageSent, setLastMessageSent] = useState<string | null>(null);
  const [lastMessageReceived, setLastMessageReceived] = useState<string | null>(null);
  const [showDebugTools, setShowDebugTools] = useState<boolean>(false);

  // Track when the component mounts
  useEffect(() => {
    logger.log(`LucidAppNew initialized with panel type: ${panelType}, useNewModelPanel: ${useNewModelPanel}`);
    return () => logger.log('LucidAppNew unmounted');
  }, [panelType, useNewModelPanel]);

  // Handle test message sending
  const handleTestMessage = () => {
    sendMessage(EnvelopeMessageType.LOG, {
      level: "info",
      text: `Test message from ${panelType} panel`,
    });
    setLastMessageSent(EnvelopeMessageType.LOG);
  };

  // Toggle debug tools visibility
  const toggleDebugTools = () => {
    setShowDebugTools(prev => !prev);
  };

  // Show different content based on panel type
  if (panelType === "auth") {
    return (
      <div className="lucid-app">
        <div className="new-messaging-header bg-amber-300 mb-2 p-1 text-center font-bold">
          New Messaging Implementation
        </div>
        <AuthPanel />
      </div>
    );
  }
  
  // Create a ValidationState object from validation data
  const validationStateObj = validation.errors ? {
    summary: {
      errorCount: validation.errors.filter(e => e.severity === 'error').length,
      warningCount: validation.errors.filter(e => e.severity === 'warning').length
    },
    messages: validation.errors.map(e => ({
      type: e.severity,
      message: e.message,
      elementId: e.elementId,
      code: e.id
    }))
  } : null;
  
  // Create a SimulationStatus object from simulation data
  const simulationStatusObj: SimulationStatus = {
    pageStatus: null,  // Default to null since we don't have this data
    isPollingSimState: false,  // Default value
    errorMessage: simulation.error || null,
    lastChecked: simulation.lastUpdated ? new Date(simulation.lastUpdated).toISOString() : null,
    newResultsAvailable: false  // Default value
  };
  
  // Convert the selected element to a ModelItemData object
  const selectedElement = selection.selectedElements?.[0];
  const modelItemData = selectedElement ? {
    id: selectedElement.id,
    data: {}, // ElementShape doesn't have data property, provide empty object
    metadata: {
      type: (selectedElement.type as unknown) as SimulationObjectType,  // Type cast since ElementShape uses string
      version: '1.0',
      lastModified: new Date().toISOString(),
      id: selectedElement.id
    },
    name: selectedElement.text || `Item ${selectedElement.id}`
  } : null;
  
  // Convert string type to DiagramElementType enum if possible
  let typedDiagramElementType: DiagramElementType | undefined;
  if (selectedElement?.type) {
    if (selectedElement.type.toLowerCase() === 'block') {
      typedDiagramElementType = DiagramElementType.BLOCK;
    } else if (selectedElement.type.toLowerCase() === 'line') {
      typedDiagramElementType = DiagramElementType.LINE;
    }
  }

  // Model panel content
  return (
    <div className="lucid-app">
      <div className="new-messaging-header bg-amber-300 mb-2 p-1 text-center font-bold">
        New Messaging Implementation {useNewModelPanel ? '- New ModelPanel' : '- Old ModelPanel'}
      </div>
      
      {useNewModelPanel ? (
        <div className="h-full flex flex-col">
          <div className="flex-none p-2 bg-gray-100 border-b flex justify-between items-center">
            <div className="text-sm">
              <span className="mr-2">
                 Auth: <strong className={auth.isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                  {auth.isAuthenticated ? "Authenticated" : "Not Authenticated"}
                </strong>
              </span>
              <span>
                Initialized: <strong>{app.initialized ? "Yes" : "No"}</strong>
              </span>
            </div>
            <button 
              onClick={toggleDebugTools}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            >
              {showDebugTools ? 'Hide Debug Tools' : 'Show Debug Tools'}
            </button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <ModelPanel />
          </div>
          
          {/* Debug tools - conditionally shown */}
          {showDebugTools && (
            <div className="debug-tools mt-4 border-t p-4">
              <div className="message-status mb-4">
                <h3 className="text-sm font-bold">Message Status</h3>
                <p className="text-xs">
                  Last message sent: <code>{lastMessageSent || "None"}</code>
                </p>
                <p className="text-xs">
                  Last message received: <code>{lastMessageReceived || "None"}</code>
                </p>
                <button 
                  onClick={handleTestMessage}
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded mt-2"
                >
                  Send Test Message
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-bold">State Inspector</h3>
                  <StateInspector />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Message Debugger</h3>
                  <MessageDebugger />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Original ModelPanelAccordion implementation
        <div className="h-full flex flex-col">
          <div className="flex-none p-2 bg-gray-100 border-b flex justify-between items-center">
            <div className="text-sm">
              <span className="mr-2">
                 Auth: <strong className={auth.isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                  {auth.isAuthenticated ? "Authenticated" : "Not Authenticated"}
                </strong>
              </span>
              <span>
                Initialized: <strong>{app.initialized ? "Yes" : "No"}</strong>
              </span>
            </div>
            <button 
              onClick={toggleDebugTools}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            >
              {showDebugTools ? 'Hide Debug Tools' : 'Show Debug Tools'}
            </button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <ModelPanelAccordion
              modelName={selection.documentContext?.documentTitle || ''}
              validationState={validationStateObj}
              currentElement={modelItemData}
              lastElementUpdate={selection.lastUpdated?.toString() || null}
              diagramElementType={typedDiagramElementType}
              onValidate={() => modelOpsSender.validateModel(selection.documentContext?.documentId || '')}
              onElementUpdate={(elementId, data) => 
                modelOpsSender.updateElementData(elementId, modelItemData?.metadata.type || '', data)
              }
              referenceData={{ entities: [], resources: [] }}
              visibleSections={{
                header: true,
                validation: true,
                editor: true,
                modelTree: false
              }}
              onSimulate={(scenarioName) => 
                simulationSender.requestSimulation(selection.documentContext?.documentId || '', scenarioName)
              }
              onRemoveModel={() => 
                modelOpsSender.removeModel(selection.documentContext?.documentId || '')
              }
              onConvertPage={() => 
                modelOpsSender.convertPage()
              }
              onElementTypeChange={(elementId, newType) => 
                modelOpsSender.convertElement(elementId, newType)
              }
              simulationStatus={simulationStatusObj}
              onViewResults={() => 
                simulationSender.viewResults(selection.documentContext?.documentId || '', simulation.jobId)
              }
              needsInitialization={selection.documentContext && !selection.documentContext.isQuodsiModel}
            />
          </div>
          
          {showDebugTools && (
            <div className="debug-tools mt-4 border-t p-4">
              <div className="message-status mb-4">
                <h3 className="text-sm font-bold">Message Status</h3>
                <p className="text-xs">
                  Last message sent: <code>{lastMessageSent || "None"}</code>
                </p>
                <p className="text-xs">
                  Last message received: <code>{lastMessageReceived || "None"}</code>
                </p>
                <button 
                  onClick={handleTestMessage}
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded mt-2"
                >
                  Send Test Message
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-bold">State Inspector</h3>
                  <StateInspector />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Message Debugger</h3>
                  <MessageDebugger />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LucidAppNew;
