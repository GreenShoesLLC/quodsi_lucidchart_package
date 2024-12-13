import React, { useState, useEffect, useCallback } from "react";
import {
  MessageTypes,
  MessagePayloads,
  createSerializableMessage,
  ModelStructure,
  ValidationState,
  SimulationObjectType,
  EditorReferenceData,
  ExtensionMessaging,
  isValidMessage,
  ElementData,
} from "@quodsi/shared";

import { ModelPanelAccordion } from "./components/ModelPanelAccordion/ModelPanelAccordion";
import { ErrorDisplay } from "./components/ui/ErrorDisplay";
import { ProcessingIndicator } from "./components/ui/ProcessingIndicator";
import { MessageHandler, messageHandlers, registerHandler } from "./services/messageHandlers/messageHandlers";


export interface AppState {
  modelStructure: ModelStructure | null;
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ElementData | null;
  isProcessing: boolean;
  error: string | null;
  documentId: string | null;
  expandedNodes: Set<string>;
  referenceData: EditorReferenceData;
  isReady: boolean;
}

const initialState: AppState = {
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
  },
  isReady: false,
};

const QuodsiApp: React.FC = () => {
  console.log("[QuodsiApp] Component mounting");
  const [state, setState] = useState<AppState>(initialState);
  const messaging = ExtensionMessaging.getInstance();

  // Create a type-safe message sender that uses window.postMessage
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
        setState((prev) => ({
          ...prev,
          error: `Failed to communicate with LucidChart: ${error}`,
        }));
      }
    },
    []
  );

  // Set up message handling
useEffect(() => {
  console.log("[QuodsiApp] Setting up ExtensionMessaging");

  const deps = {
    setState,
    setError: (error: string | null) =>
      setState((prev) => ({ ...prev, error })),
    sendMessage,
  };

  // Register handlers in a type-safe way
  (
    Object.entries(messageHandlers) as [
      MessageTypes,
      MessageHandler<MessageTypes>
    ][]
  ).forEach(([type, handler]) => {
    registerHandler(messaging, type, handler, deps);
  });

  const handleWindowMessage = (event: MessageEvent) => {
    const message = event.data;
    if (!isValidMessage(message)) {
      console.error("[QuodsiApp] Invalid message format:", message);
      return;
    }
    messaging.handleIncomingMessage(message);
  };

  window.addEventListener("message", handleWindowMessage);
  sendMessage(MessageTypes.REACT_APP_READY);

  return () => {
    window.removeEventListener("message", handleWindowMessage);
  };
}, [messaging, sendMessage]);

  // Debug logging for state changes
  useEffect(() => {
    console.log("[QuodsiApp] State updated:", {
      modelStructure: state.modelStructure,
      modelName: state.modelName,
      validationState: state.validationState,
      currentElement: state.currentElement,
      expandedNodes: state.expandedNodes,
    });
  }, [state]);

  // Event handlers
  const handleElementSelect = useCallback(
    (elementId: string) => {
      console.log("[QuodsiApp] Element selected:", elementId);
      sendMessage(MessageTypes.GET_ELEMENT_DATA, { elementId });
    },
    [sendMessage]
  );

  const handleValidate = useCallback(() => {
    console.log("[QuodsiApp] Validate requested");
    sendMessage(MessageTypes.VALIDATE_MODEL);
  }, [sendMessage]);

  const handleUpdate = useCallback(
    (elementId: string, data: any) => {
      console.log("[QuodsiApp] Update requested:", { elementId, data });
      setState((prev) => ({ ...prev, isProcessing: true }));

      // If this is a type conversion (data contains only type)
      if (data.type && Object.keys(data).length === 1) {
        sendMessage(MessageTypes.CONVERT_ELEMENT, {
          elementId,
          type: data.type,
        });
      } else {
        // Regular update
        sendMessage(MessageTypes.UPDATE_ELEMENT_DATA, {
          elementId,
          type:
            state.currentElement?.metadata?.type || SimulationObjectType.None,
          data: {
            ...data,
            id: elementId,
          },
        });
      }
    },
    [sendMessage, state.currentElement?.metadata?.type]
  );

  const handleTreeNodeToggle = useCallback(
    (nodeId: string, expanded: boolean) => {
      console.log("[QuodsiApp] Tree node toggle:", { nodeId, expanded });
      sendMessage(MessageTypes.TREE_NODE_TOGGLE, {
        nodeId,
        expanded,
        pageId: state.documentId || "",
      });
    },
    [sendMessage, state.documentId]
  );

  const handleTreeStateUpdate = useCallback(
    (expandedNodes: string[]) => {
      console.log("[QuodsiApp] Tree state update:", { expandedNodes });
      sendMessage(MessageTypes.TREE_STATE_UPDATE, {
        expandedNodes,
        pageId: state.documentId || "",
      });
    },
    [sendMessage, state.documentId]
  );

  const handleExpandPath = useCallback(
    (nodeId: string) => {
      console.log("[QuodsiApp] Expand path requested:", nodeId);
      sendMessage(MessageTypes.TREE_NODE_EXPAND_PATH, {
        nodeId,
        pageId: state.documentId || "",
      });
    },
    [sendMessage, state.documentId]
  );

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
