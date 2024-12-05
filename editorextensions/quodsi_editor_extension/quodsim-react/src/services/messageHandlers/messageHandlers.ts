import React from "react"; 
import { MessagePayloads, MessageTypes } from "../../shared/types/MessageTypes";
import { QuodsiAppState } from "../../QuodsiApp";
import ModelUtilities from "../../components/ModelUtilities";
import { ModelTabs } from "../../components/ModelTabs";
import { SimulationComponentSelector } from "src/components/SimulationComponentSelector";
import { createEmptyData } from "src/utils/emptyDataCreator";
import { typeMappers } from "src/utils/typeMappers";
import { SelectionType } from "src/shared/types/SelectionType";
import { createEditorComponent } from "../editors/editorFactory";
import { SimComponentType } from "src/shared/types/simComponentType";


export interface MessageHandlerDependencies {
    setState: React.Dispatch<React.SetStateAction<QuodsiAppState>>;
    setEditor: (editor: JSX.Element | null) => void;
    setEditorForElement: (element: any) => void;
    setError: (error: string | null) => void;
    handleSave: (data: any) => void;
    handleCancel: () => void;
    handleComponentTypeChange: (newType: SimComponentType, elementId: string) => void;
    currentElementId?: string; // Add this
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
        const { setEditorForElement, setEditor, setState } = deps;

        // Handle unconverted element case
        if (data.selectionState?.selectionType === SelectionType.UNCONVERTED_ELEMENT) {
            const elementId = data.selectionState?.selectedIds[0] || '';
            console.log("[MessageHandler] Handling unconverted element:", elementId);

            setState(prev => ({
                ...prev,
                currentComponentType: undefined,
                currentLucidId: elementId
            }));

            setEditor(
                React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(SimulationComponentSelector, {
                        currentType: undefined,
                        elementId: elementId, // Add elementId here
                        onTypeChange: (newType) => {
                            console.log("[MessageHandler] Type change requested for unconverted element:", {
                                elementId,
                                newType
                            });

                            if (!elementId) {
                                console.error("[MessageHandler] No element ID available for type change");
                                return;
                            }

                            const simulationType = typeMappers.mapComponentTypeToSimulationType(newType);
                            const emptyData = createEmptyData(simulationType, elementId);

                            console.log("[MessageHandler] Sending update for unconverted element:", {
                                elementId,
                                type: simulationType,
                                data: emptyData
                            });

                            window.parent.postMessage({
                                messagetype: MessageTypes.UPDATE_ELEMENT_DATA,
                                data: {
                                    elementId,
                                    type: simulationType,
                                    data: emptyData
                                }
                            }, "*");
                        },
                        disabled: false
                    })
                )
            );
            return;
        }

        // Case 1: Single element selected
        if (data.elementData && data.elementData.length === 1) {
            const element = data.elementData[0];
            const elementId = element.id;

            console.log("[MessageHandler] Handling single element selection:", {
                elementId,
                type: element.metadata?.type
            });

            // If element has metadata (is converted)
            if (element.metadata?.type) {
                const componentType = typeMappers.mapSimulationTypeToComponentType(element.metadata.type);

                // Update state with the component type
                setState(prev => ({
                    ...prev,
                    currentComponentType: componentType,
                    currentLucidId: elementId
                }));

                setEditor(
                    React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(SimulationComponentSelector, {
                            currentType: componentType,
                            elementId: elementId, // Add elementId here
                            onTypeChange: (newType) => {
                                console.log("[MessageHandler] Type change requested for converted element:", {
                                    elementId,
                                    currentType: componentType,
                                    newType
                                });

                                if (!elementId) {
                                    console.error("[MessageHandler] No element ID available for type change");
                                    return;
                                }

                                const simulationType = typeMappers.mapComponentTypeToSimulationType(newType);
                                const emptyData = createEmptyData(simulationType, elementId);

                                console.log("[MessageHandler] Sending update for converted element:", {
                                    elementId,
                                    type: simulationType,
                                    data: emptyData
                                });

                                window.parent.postMessage({
                                    messagetype: MessageTypes.UPDATE_ELEMENT_DATA,
                                    data: {
                                        elementId,
                                        type: simulationType,
                                        data: emptyData
                                    }
                                }, "*");
                            },
                            disabled: false
                        })
                    )
                );
            }

            setEditorForElement(element);
            return;
        }

        // Case 2: Nothing selected (page/model selected) and model exists
        if (data.elementData && data.elementData.length === 0 && data.selectionState?.pageId) {
            console.log("[MessageHandler] Handling model/page selection");

            // Update state to clear component type
            setState(prev => ({
                ...prev,
                currentComponentType: undefined,
                currentLucidId: ''
            }));

            // Get the model data from the parent
            window.parent.postMessage({
                messagetype: MessageTypes.GET_ELEMENT_DATA,
                data: { elementId: data.selectionState.pageId }
            }, "*");
        }
    },
    handleElementData: (
        data: MessagePayloads[MessageTypes.ELEMENT_DATA],
        deps: MessageHandlerDependencies
    ) => {
        const { setEditor, setState, handleSave, handleCancel, handleComponentTypeChange } = deps;

        if (data.metadata?.type) {
            const componentType = typeMappers.mapSimulationTypeToComponentType(data.metadata.type);
            const elementId = data.id; // Get the elementId from the data

            setState(prev => ({
                ...prev,
                currentComponentType: componentType,
                currentLucidId: elementId
            }));

            const editor = createEditorComponent(
                data.metadata.type,
                data.data,
                {
                    onSave: handleSave,
                    onCancel: handleCancel,
                    onTypeChange: handleComponentTypeChange,
                    elementId: elementId  // Add elementId to EditorHandlers
                },
                false
            );

            if (editor) {
                setEditor(
                    React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(SimulationComponentSelector, {
                            currentType: componentType,
                            elementId: elementId,  // Add elementId to SimulationComponentSelector
                            onTypeChange: handleComponentTypeChange,
                            disabled: false
                        }),
                        editor
                    )
                );
            }
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

    handleUpdateSuccess: (
        data: MessagePayloads[MessageTypes.UPDATE_SUCCESS],
        deps: MessageHandlerDependencies
    ) => {
        const { setState, setEditorForElement } = deps;

        setState((prev) => ({ ...prev, isProcessing: false }));

        // Request fresh element data to update the editor
        window.parent.postMessage({
            messagetype: MessageTypes.GET_ELEMENT_DATA,
            data: { elementId: data.elementId }
        }, "*");
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