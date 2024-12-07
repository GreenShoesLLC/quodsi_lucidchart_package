import React, { useState, useEffect, useCallback } from "react";
import { SelectionType, SimComponentType, SimulationObjectTypeFactory } from "@quodsi/shared";
import {
  MessageTypes,
  MessagePayloads,
  createSerializableMessage,
} from "@quodsi/shared";
import { SimulationObjectType } from "@quodsi/shared";

import { StatusMonitor } from "./components/StatusMonitor";
import { ErrorDisplay } from "./components/ui/ErrorDisplay";
import { ProcessingIndicator } from "./components/ui/ProcessingIndicator";
import { messageHandlers } from "./services/messageHandlers/messageHandlers";
import { typeMappers } from "./utils/typeMappers";

import { createEditorComponent } from "./services/editors/editorFactory";
import { SelectionContextProvider } from "./components/SelectionContextProvider";

export interface QuodsiAppState {
  editor: React.ReactElement | null;
  documentId: string | null;
  currentComponentType?: SimComponentType;
  isProcessing: boolean;
  currentLucidId: string;
  error: string | null;
  selectionType?: SelectionType;
}

const QuodsiApp: React.FC = () => {
  const [state, setState] = useState<QuodsiAppState>({
    editor: null,
    documentId: null,
    currentComponentType: undefined,
    isProcessing: false,
    currentLucidId: "",
    error: null,
    selectionType: undefined,
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

  const handleMessage = useCallback(
    (message: any) => {
      if (!message?.messagetype) {
        console.error("[QuodsiApp] Invalid message format:", message);
        return;
      }

      const deps = {
        setState,
        setEditor,
        setEditorForElement,
        setError,
        handleSave,
        handleCancel,
        handleComponentTypeChange,
      };

      try {
        switch (message.messagetype) {
          case MessageTypes.INITIAL_STATE:
            messageHandlers.handleInitialState(message.data, deps);
            break;
          case MessageTypes.SELECTION_CHANGED:
            messageHandlers.handleSelectionChanged(message.data, deps);
            break;
          case MessageTypes.ELEMENT_DATA:
            messageHandlers.handleElementData(message.data, deps);
            break;
          case MessageTypes.MODEL_REMOVED:
            messageHandlers.handleModelRemoved(deps);
            break;
          case MessageTypes.UPDATE_SUCCESS:
            messageHandlers.handleUpdateSuccess(message.data, deps);
            break;
          case MessageTypes.ERROR:
            messageHandlers.handleError(message.data, deps);
            break;
          case MessageTypes.CONVERSION_COMPLETE:
            messageHandlers.handleConversionComplete(message.data, deps);
            break;
        }
      } catch (error) {
        console.error("[QuodsiApp] Error handling message:", error);
        setError(`Error handling message: ${error}`);
      }
    },
    [state.isProcessing]
  );

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

  type TypeChangeHandler = (
    newType: SimComponentType,
    elementId: string
  ) => void;

  const handleComponentTypeChange: TypeChangeHandler = (newType, elementId) => {
    console.log("[QuodsiApp] Starting component type change:", {
      elementId,
      currentState: state,
      newType,
    });

    if (!elementId) {
      console.error("[QuodsiApp] Cannot change type - no element ID provided", {
        newType: newType,
      });
      return;
    }

    setState((prev) => ({
      ...prev,
      isProcessing: true,
      currentComponentType:
        newType === SimComponentType.NONE ? undefined : newType,
    }));

    if (newType === SimComponentType.NONE) {
      // Send a message to clear the element's Quodsi data
      const elementData = {
        elementId,
        type: SimulationObjectType.None, // or undefined, depending on what your extension expects
        data: {},
      };

      try {
        sendToParent(MessageTypes.UPDATE_ELEMENT_DATA, elementData);
        console.log("[QuodsiApp] Clear data message sent");
      } catch (error) {
        console.error("[QuodsiApp] Error sending clear data message:", error);
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
      return;
    }

    const simulationType =
      typeMappers.mapComponentTypeToSimulationType(newType);


    const emptyData = SimulationObjectTypeFactory.createElement(
      simulationType,
      elementId
    );

    const elementData = {
      elementId,
      type: simulationType,
      data: emptyData,
    };

    console.log("[QuodsiApp] Prepared update data:", elementData);

    try {
      sendToParent(MessageTypes.UPDATE_ELEMENT_DATA, elementData);
      console.log("[QuodsiApp] Update message sent");
    } catch (error) {
      console.error("[QuodsiApp] Error sending update:", error);
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  };
  const handleSave = (data: any) => {
    console.log("[QuodsiApp] Handling save:", {
      data,
      stateSnapshot: state,
    });

    if (!data.id) {
      console.error("[QuodsiApp] Missing required data for save:", data);
      setError("Invalid data for save operation");
      return;
    }

    // Use type from data or from state
    const type =
      data.type ||
      (state.currentComponentType
        ? typeMappers.mapComponentTypeToSimulationType(
            state.currentComponentType
          )
        : undefined);

    if (!type) {
      console.error("[QuodsiApp] Missing type information for save:", data);
      setError("Missing type information for save");
      return;
    }

    const elementData = {
      elementId: data.id,
      type: type,
      data: {
        ...data,
        type: type, // Ensure type is included in data
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

  const setEditorForElement = (element: any) => {
    // Special handling for unconverted elements
    if (!element?.metadata?.type || element?.selectionType === SelectionType.UNCONVERTED_ELEMENT) {
      setState((prev) => ({
        ...prev,
        currentLucidId: element.id,
        currentComponentType: undefined,
        selectionType: SelectionType.UNCONVERTED_ELEMENT,
      }));

      setEditor(
        React.createElement(SelectionContextProvider, {
          elementId: element.id,
          currentType: undefined,
          onTypeChange: handleComponentTypeChange,
          disabled: state.isProcessing,
        })
      );
      return;
    }

    // Regular element handling
    if (!element?.id || !element?.metadata?.type || !element?.referenceData) {
      console.error("[QuodsiApp] Invalid element data:", element);
      return;
    }

    const elementType = element.metadata.type as SimulationObjectType;
    const componentType =
      typeMappers.mapSimulationTypeToComponentType(elementType);

    setState((prev) => ({
      ...prev,
      currentLucidId: element.id,
      currentComponentType: componentType,
      selectionType: element.selectionType,
    }));

    const editorComponent = createEditorComponent(
      elementType,
      element.data,
      {
        onSave: handleSave,
        onCancel: handleCancel,
        onTypeChange: handleComponentTypeChange,
        elementId: element.id,
        referenceData: element.referenceData,
      },
      state.isProcessing
    );

    if (editorComponent) {
      setEditor(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(SelectionContextProvider, {
            elementId: element.id,
            currentType: componentType,
            onTypeChange: handleComponentTypeChange,
            disabled: state.isProcessing,
          }),
          editorComponent
        )
      );
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
