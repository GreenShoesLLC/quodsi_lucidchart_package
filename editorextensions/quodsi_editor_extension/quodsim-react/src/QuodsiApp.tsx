import React, { useState, useEffect, useCallback } from "react";
import {
  MessageTypes,
  MessagePayloads,
  createSerializableMessage,
  ModelStructure,
  ValidationState,
  ValidationMessage,
  SimulationObjectType,
  EditorReferenceData,
} from "@quodsi/shared";

import { ModelPanelAccordion } from "./components/ModelPanelAccordion/ModelPanelAccordion";
import { ErrorDisplay } from "./components/ui/ErrorDisplay";
import { ProcessingIndicator } from "./components/ui/ProcessingIndicator";

export interface AppState {
  modelStructure: ModelStructure | null;
  modelName: string;
  validationState: ValidationState | null;
  currentElement: {
    data: any;
    metadata: any;
  } | null;
  isProcessing: boolean;
  error: string | null;
  documentId: string | null;
  expandedNodes: Set<string>;
  referenceData: EditorReferenceData;
}

const QuodsiApp: React.FC = () => {
  console.log("[QuodsiApp] Component mounting");
  
  const [state, setState] = useState<AppState>({
    modelStructure: null,
    modelName: "New Model",
    validationState: null,
    currentElement: null,
    isProcessing: false,
    error: null,
    documentId: null,
    expandedNodes: new Set<string>(),
    referenceData: {
      entities: [],
      resources: [],
      // other reference data properties
    },
  });

  const sendMessage = useCallback(
    <T extends MessageTypes>(type: T, payload?: MessagePayloads[T]) => {
      console.log("[QuodsiApp] Sending message:", { type, payload });
      try {
        window.parent.postMessage(
          createSerializableMessage(type, payload),
          "*"
        );
      } catch (error) {
        console.error("[QuodsiApp] Failed to send message:", error);
        setState(prev => ({
          ...prev,
          error: `Failed to communicate with LucidChart: ${error}`,
        }));
      }
    },
    []
  );

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const message = event.data;
      console.log("[QuodsiApp] Received message:", message);

      if (!message?.messagetype) {
        console.error("[QuodsiApp] Invalid message format:", message);
        return;
      }

      setState(prev => ({ ...prev, error: null }));

      try {
        switch (message.messagetype) {
          case MessageTypes.INITIAL_STATE:
            console.log("[QuodsiApp] Processing INITIAL_STATE:", message.data);
            const modelStructure = message.data?.modelStructure || {
              elements: message.data?.elements || [],
              hierarchy: message.data?.hierarchy || {}
            };
            console.log("[QuodsiApp] Created modelStructure:", modelStructure);
            setState(prev => ({
              ...prev,
              modelStructure,
              modelName: message.data.pageTitle || message.data.modelData?.name || "New Model",
              documentId: message.data.documentId,
              validationState: message.data.validationResult || null,
              expandedNodes: new Set<string>(message.data.expandedNodes || []),
            }));
            break;

          case MessageTypes.SELECTION_CHANGED:
            console.log("[QuodsiApp] Processing SELECTION_CHANGED:", message.data);
            setState(prev => {
              const expandedNodesArray = message.data.expandedNodes || Array.from(prev.expandedNodes);
              return {
                ...prev,
                currentElement: message.data.elementData?.[0] || null,
                modelStructure: message.data.modelStructure || prev.modelStructure,
                expandedNodes: new Set<string>(expandedNodesArray),
              };
            });

            if (message.data.elementData?.[0]?.id) {
              sendMessage(MessageTypes.GET_ELEMENT_DATA, {
                elementId: message.data.elementData[0].id,
              });
            }
            break;

          case MessageTypes.TREE_STATE_SYNC:
            setState(prev => ({
              ...prev,
              expandedNodes: new Set<string>(message.data.expandedNodes),
            }));
            break;

          case MessageTypes.ELEMENT_DATA:
            setState(prev => ({
              ...prev,
              currentElement: {
                data: message.data.data,
                metadata: message.data.metadata,
              },
            }));
            break;

          case MessageTypes.VALIDATION_RESULT:
            setState(prev => ({
              ...prev,
              validationState: {
                summary: {
                  errorCount: message.data.messages.filter(
                    (m: ValidationMessage) => m.type === "error"
                  ).length,
                  warningCount: message.data.messages.filter(
                    (m: ValidationMessage) => m.type === "warning"
                  ).length,
                },
                messages: message.data.messages,
              },
            }));
            break;

          case MessageTypes.UPDATE_SUCCESS:
            setState(prev => ({ ...prev, isProcessing: false }));
            break;

          case MessageTypes.ERROR:
            console.error("[QuodsiApp] Received ERROR message:", message.data);
            setState(prev => ({
              ...prev,
              error: message.data.error,
              isProcessing: false,
            }));
            break;
        }
      } catch (error) {
        console.error("[QuodsiApp] Error handling message:", error);
        setState(prev => ({
          ...prev,
          error: `Error handling message: ${error}`,
          isProcessing: false,
        }));
      }
    },
    [sendMessage]
  );

  useEffect(() => {
    console.log("[QuodsiApp] Setting up message listener");
    window.addEventListener("message", handleMessage);
    sendMessage(MessageTypes.REACT_APP_READY);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleMessage, sendMessage]);

  useEffect(() => {
    console.log("[QuodsiApp] ModelPanelAccordion props:", {
      modelStructure: state.modelStructure,
      modelName: state.modelName,
      validationState: state.validationState,
      currentElement: state.currentElement,
      expandedNodes: state.expandedNodes,
    });
  }, [state]);

  const handleElementSelect = (elementId: string) => {
    console.log("[QuodsiApp] Element selected:", elementId);
    sendMessage(MessageTypes.GET_ELEMENT_DATA, { elementId });
  };

  const handleValidate = () => {
    console.log("[QuodsiApp] Validate requested");
    sendMessage(MessageTypes.VALIDATE_MODEL);
  };

  const handleUpdate = (elementId: string, data: any) => {
    console.log("[QuodsiApp] Update requested:", { elementId, data });
    setState(prev => ({ ...prev, isProcessing: true }));
    sendMessage(MessageTypes.UPDATE_ELEMENT_DATA, {
      elementId,
      type: state.currentElement?.metadata?.type || SimulationObjectType.None,
      data: {
        ...data,
        id: elementId,
      },
    });
  };

  const handleTreeNodeToggle = (nodeId: string, expanded: boolean) => {
    console.log("[QuodsiApp] Tree node toggle:", { nodeId, expanded });
    sendMessage(MessageTypes.TREE_NODE_TOGGLE, {
      nodeId,
      expanded,
      pageId: state.documentId || "",
    });
  };

  const handleTreeStateUpdate = (expandedNodes: string[]) => {
    console.log("[QuodsiApp] Tree state update:", { expandedNodes });
    sendMessage(MessageTypes.TREE_STATE_UPDATE, {
      expandedNodes,
      pageId: state.documentId || "",
    });
  };

  const handleExpandPath = (nodeId: string) => {
    console.log("[QuodsiApp] Expand path requested:", nodeId);
    sendMessage(MessageTypes.TREE_NODE_EXPAND_PATH, {
      nodeId,
      pageId: state.documentId || "",
    });
  };

  return (
    <div className="flex flex-col h-screen">
      {state.error && <ErrorDisplay error={state.error} />}
      {state.isProcessing && <ProcessingIndicator />}
      <div className="flex-grow overflow-auto">
        <ModelPanelAccordion
          modelStructure={state.modelStructure}
          modelName={state.modelName}
          validationState={state.validationState}
          currentElement={state.currentElement}
          expandedNodes={state.expandedNodes}
          onElementSelect={handleElementSelect}
          onValidate={handleValidate}
          onUpdate={handleUpdate}
          onTreeNodeToggle={handleTreeNodeToggle}
          onTreeStateUpdate={handleTreeStateUpdate}
          onExpandPath={handleExpandPath}
          referenceData={state.referenceData}
        />
      </div>
    </div>
  );
};

export default QuodsiApp;