import { MessagePayloads, MessageTypes } from "../../shared/types/MessageTypes";
import { QuodsiAppState } from "../../QuodsiApp";
import ModelUtilities from "../../components/ModelUtilities";
import { ModelTabs } from "../../components/ModelTabs";
import React from "react";

export interface MessageHandlerDependencies {
    setState: React.Dispatch<React.SetStateAction<QuodsiAppState>>;
    setEditor: (editor: JSX.Element | null) => void;
    setEditorForElement: (element: any) => void;
    setError: (error: string | null) => void;
}

export const messageHandlers = {
    handleInitialState: (
        data: MessagePayloads[MessageTypes.INITIAL_STATE],
        deps: MessageHandlerDependencies
    ) => {
        const { setState, setEditor, setError } = deps;

        if (!data.pageId) {
            console.error("[MessageHandler] Invalid pageId received:", data.pageId);
            setError("Invalid page ID received");
            return;
        }

        setState((prev) => ({
            ...prev,
            documentId: data.pageId,
            error: null,
        }));

        if (!data.isModel) {
            setEditor(React.createElement(ModelUtilities, {
                showConvertButton: true,
                showValidateButton: false,
                showRemoveButton: false,
                showSimulateButton: false
            }));
        } else {
            setEditor(
                React.createElement('div',
                    { className: "flex flex-col h-full" },
                    React.createElement(ModelTabs, {
                        initialModel: data.modelData
                    }),
                    React.createElement('div',
                        { className: "mt-4 border-t pt-4" },
                        React.createElement(ModelUtilities, {
                            showConvertButton: false,
                            showValidateButton: true,
                            showRemoveButton: true,
                            showSimulateButton: true
                        })
                    )
                )
            );
        }
    },

    handleSelectionChanged: (
        data: MessagePayloads[MessageTypes.SELECTION_CHANGED],
        deps: MessageHandlerDependencies
    ) => {
        console.log("[MessageHandler] Handling selection changed:", data);
        const { setEditorForElement, setEditor } = deps;

        // Case 1: Single element selected
        if (data.elementData && data.elementData.length === 1) {
            const element = data.elementData[0];
            setEditorForElement(element);
            return;
        }

        // Case 2: Nothing selected (page/model selected) and model exists
        if (data.elementData && data.elementData.length === 0 && data.selectionState?.pageId) {
            // Get the model data from the parent
            window.parent.postMessage({
                messagetype: MessageTypes.GET_ELEMENT_DATA,
                data: { elementId: data.selectionState.pageId }
            }, "*");

            // This will trigger a response that will be handled by the ELEMENT_DATA handler
            // which should then show the model editor
        }
    },
    handleElementData: (
        data: MessagePayloads[MessageTypes.ELEMENT_DATA],
        deps: MessageHandlerDependencies
    ) => {
        const { setEditor } = deps;

        if (data.metadata?.type === 'Model' && data.data) {
            setEditor(
                React.createElement('div',
                    { className: "flex flex-col h-full" },
                    React.createElement(ModelTabs, {
                        initialModel: data.data
                    }),
                    React.createElement('div',
                        { className: "mt-4 border-t pt-4" },
                        React.createElement(ModelUtilities, {
                            showConvertButton: false,
                            showValidateButton: true,
                            showRemoveButton: true,
                            showSimulateButton: true
                        })
                    )
                )
            );
        }
    },
    handleModelRemoved: (deps: MessageHandlerDependencies) => {
        deps.setEditor(React.createElement(ModelUtilities, {
            showConvertButton: true,
            showValidateButton: false,
            showRemoveButton: false,
            showSimulateButton: false
        }));
    },

    handleUpdateSuccess: (deps: MessageHandlerDependencies) => {
        deps.setState((prev) => ({ ...prev, isProcessing: false }));
    },

    handleError: (
        data: MessagePayloads[MessageTypes.ERROR],
        deps: MessageHandlerDependencies
    ) => {
        console.error("[MessageHandler] Error received:", data);
        deps.setError(data.error);
    },

    handleConversionComplete: (
        data: MessagePayloads[MessageTypes.CONVERSION_COMPLETE],
        deps: MessageHandlerDependencies
    ) => {
        console.log("[MessageHandler] Conversion complete:", data);
        deps.setState((prev) => ({ ...prev, isProcessing: false }));
    }
};