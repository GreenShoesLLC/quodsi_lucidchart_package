import React from "react";
import { MessagePayloads, MessageTypes, SelectionType } from "@quodsi/shared";
import { QuodsiAppState } from "../../QuodsiApp";
import ModelUtilities from "../../components/ModelUtilities";
import { ModelTabs } from "../../components/ModelTabs";
import { SimulationComponentSelector } from "src/components/SimulationComponentSelector";
import { typeMappers } from "src/utils/typeMappers";
import { createEditorComponent } from "../editors/editorFactory";
import { SimComponentType } from "@quodsi/shared";



export interface MessageHandlerDependencies {
    setState: React.Dispatch<React.SetStateAction<QuodsiAppState>>;
    setEditor: (editor: JSX.Element | null) => void;
    setEditorForElement: (element: any) => void;
    setError: (error: string | null) => void;
    handleSave: (data: any) => void;
    handleCancel: () => void;
    handleComponentTypeChange: (newType: SimComponentType, elementId: string) => void;
    currentElementId?: string;
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
        if (!data.elementData?.[0]) return;

        const element = data.elementData[0];
        const { setState, setEditor } = deps;

        // Check if this is an unconverted element
        if (data.selectionState?.selectionType === SelectionType.UNCONVERTED_ELEMENT) {
            console.log("[MessageHandler] Handling unconverted element:", element.id);
            setState(prev => ({
                ...prev,
                currentComponentType: undefined,
                currentLucidId: element.id,
                isProcessing: false
            }));

            // For unconverted elements, just show the selector
            setEditor(
                React.createElement(
                    'div',
                    { className: 'editor-container' },
                    React.createElement(SimulationComponentSelector, {
                        currentType: undefined,
                        elementId: element.id,
                        onTypeChange: deps.handleComponentTypeChange,
                        disabled: false
                    })
                )
            );
            return;
        }
        // Handle converted elements 
        if (element.metadata?.type) {
            const componentType = typeMappers.mapSimulationTypeToComponentType(element.metadata.type);
            setState(prev => ({
                ...prev,
                currentComponentType: componentType,
                currentLucidId: element.id,
                isProcessing: true
            }));

            // Request complete element data
            window.parent.postMessage({
                messagetype: MessageTypes.GET_ELEMENT_DATA,
                data: { elementId: element.id }
            }, "*");
        }
    },

    handleElementData: (
        data: MessagePayloads[MessageTypes.ELEMENT_DATA],
        deps: MessageHandlerDependencies
    ) => {
        if (!data.metadata?.type || !data.data) return;

        const { setEditor, handleSave, handleCancel, handleComponentTypeChange, setState } = deps;
        const componentType = typeMappers.mapSimulationTypeToComponentType(data.metadata.type);

        setState(prev => ({
            ...prev,
            isProcessing: false,
            currentComponentType: componentType,
            currentLucidId: data.id
        }));

        const editorComponent = createEditorComponent(
            data.metadata.type,
            data.data,
            {
                onSave: handleSave,
                onCancel: handleCancel,
                onTypeChange: handleComponentTypeChange,
                elementId: data.id,
                referenceData: data.referenceData || {}
            },
            false
        );

        setEditor(
            React.createElement(
                'div',
                { className: 'editor-container' },
                React.createElement(SimulationComponentSelector, {
                    currentType: componentType,
                    elementId: data.id,
                    onTypeChange: handleComponentTypeChange,
                    disabled: false
                }),
                editorComponent
            )
        );
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