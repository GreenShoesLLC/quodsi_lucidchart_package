import React, { useState, useEffect, useCallback } from "react";
import { SimComponentType } from "./shared/types/simComponentTypes";
import {
  MessageTypes,
  MessagePayloads,
  createSerializableMessage,
} from "./shared/types/MessageTypes";
import { SimulationObjectType } from "./shared/types/elements/SimulationObjectType";
import { SelectionState } from "./shared/types/SelectionTypes";
import { SimulationComponentSelector } from "./components/SimulationComponentSelector";
import { StatusMonitor } from "./components/StatusMonitor";
import { ErrorDisplay } from "./components/ui/ErrorDisplay";
import { ProcessingIndicator } from "./components/ui/ProcessingIndicator";
import { messageHandlers } from "./services/messageHandlers/messageHandlers";
import { typeMappers } from "./utils/typeMappers";
import { createEmptyData } from "./utils/emptyDataCreator";
import { createEditorComponent } from "./services/editors/editorFactory";

export interface QuodsiAppState {
  editor: React.ReactElement | null;
  documentId: string | null;
  currentComponentType?: SimComponentType;
  isProcessing: boolean;
  currentLucidId: string;
  error: string | null;
}

const QuodsiApp: React.FC = () => {
  const [state, setState] = useState<QuodsiAppState>({
    editor: null,
    documentId: null,
    currentComponentType: undefined,
    isProcessing: false,
    currentLucidId: "",
    error: null,
  });

  const sendToParent = useCallback(
    <T extends MessageTypes>(type: T, payload?: MessagePayloads[T]) => {
      try {
        window.parent.postMessage(
          createSerializableMessage(type, payload),
          "*"
        );
      } catch (error) {
        console.error("[QuodsiApp] Error sending message to parent:", error);
        setError(`Failed to communicate with LucidChart: ${error}`);
      }
    },
    []
  );

  const setError = (error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  };

  const setEditor = (newEditor: React.ReactElement | null) => {
    setState((prev) => ({ ...prev, editor: newEditor }));
  };

  const handleMessage = useCallback((message: any) => {
    if (!message || !message.messagetype) {
      console.error("[QuodsiApp] Invalid message format:", message);
      return;
    }

    const deps = {
      setState,
      setEditor,
      setEditorForElement,
      setError,
    };

    try {
      switch (message.messagetype) {
        case MessageTypes.INITIAL_STATE:
          messageHandlers.handleInitialState(message.data, deps);
          break;
        case MessageTypes.MODEL_REMOVED:
          messageHandlers.handleModelRemoved(deps);
          break;
        case MessageTypes.SELECTION_CHANGED:
          messageHandlers.handleSelectionChanged(message.data, deps);
          break;
        case MessageTypes.UPDATE_SUCCESS:
          messageHandlers.handleUpdateSuccess(deps);
          break;
        case MessageTypes.ERROR:
          messageHandlers.handleError(message.data, deps);
          break;
        case MessageTypes.CONVERSION_COMPLETE:
          messageHandlers.handleConversionComplete(message.data, deps);
          break;
        case MessageTypes.ELEMENT_DATA: // Add this case
          messageHandlers.handleElementData(message.data, deps);
          break;
      }
    } catch (error) {
      console.error("[QuodsiApp] Error handling message:", error);
      setError(`Error handling message: ${error}`);
    }
  }, []);

  useEffect(() => {
    const eventListener = (event: MessageEvent) => {
      console.log("[QuodsiApp] Received message:", event.data);
      handleMessage(event.data);
    };

    window.addEventListener("message", eventListener);
    sendToParent(MessageTypes.REACT_APP_READY);

    return () => {
      window.removeEventListener("message", eventListener);
    };
  }, [handleMessage, sendToParent]);

  const handleComponentTypeChange = (newType: SimComponentType) => {
    console.log("[QuodsiApp] Component type change requested:", {
      from: state.currentComponentType,
      to: newType,
      lucidId: state.currentLucidId,
    });

    setState((prev) => ({
      ...prev,
      isProcessing: true,
      currentComponentType: newType,
    }));

    const simulationType =
      typeMappers.mapComponentTypeToSimulationType(newType);
    const emptyData = createEmptyData(simulationType, state.currentLucidId);

    const elementData = {
      elementId: state.currentLucidId,
      type: simulationType,
      data: emptyData,
    };

    console.log("[QuodsiApp] Sending type change update:", elementData);
    sendToParent(MessageTypes.UPDATE_ELEMENT_DATA, elementData);
  };

  const handleSave = (data: any) => {
    console.log("[QuodsiApp] Handling save:", {
      data,
      stateSnapshot: state,
    });

    // Ensure we have the required data
    if (!data.id || !data.type) {
      console.error("[QuodsiApp] Missing required data for save:", data);
      setError("Invalid data for save operation");
      return;
    }

    const elementData = {
      elementId: data.id,
      type: data.type,
      data: {
        ...data,
        // Convert infinity values to null for storage
        inputBufferCapacity:
          data.inputBufferCapacity === Infinity
            ? null
            : data.inputBufferCapacity,
        outputBufferCapacity:
          data.outputBufferCapacity === Infinity
            ? null
            : data.outputBufferCapacity,
      },
    };

    console.log("[QuodsiApp] Sending update with data:", elementData);
    sendToParent(MessageTypes.UPDATE_ELEMENT_DATA, elementData);
    setState((prev) => ({ ...prev, isProcessing: true }));
  };

  const handleCancel = () => {
    console.log("[QuodsiApp] Handling cancel");
    setEditor(null);
  };

  const setEditorForElement = (element: {
    id: string;
    data: any;
    metadata: any;
  }) => {
    const elementType = element.metadata.type as SimulationObjectType;
    const componentType =
      typeMappers.mapSimulationTypeToComponentType(elementType);

    setState((prev) => ({
      ...prev,
      currentLucidId: element.id,
      currentComponentType: componentType,
    }));

    const editor = createEditorComponent(
      elementType,
      element.data,
      {
        onSave: handleSave,
        onCancel: handleCancel,
        onTypeChange: handleComponentTypeChange,
      },
      state.isProcessing
    );

    if (editor) {
      setEditor(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(SimulationComponentSelector, {
            currentType: componentType,
            onTypeChange: handleComponentTypeChange,
            disabled: state.isProcessing,
          }),
          editor
        )
      );
    } else {
      setEditor(null);
      setError(`Unable to create editor for element type: ${elementType}`);
    }
  };

  return React.createElement(
    "div",
    { className: "flex flex-col h-screen" },
    state.error && React.createElement(ErrorDisplay, { error: state.error }),
    state.isProcessing && React.createElement(ProcessingIndicator),
    React.createElement(
      "div",
      { className: "flex-grow overflow-auto" },
      state.editor
    )
    // state.documentId &&
    //   React.createElement(StatusMonitor, {
    //     documentId: state.documentId,
    //   })
  );
};

export default QuodsiApp;
