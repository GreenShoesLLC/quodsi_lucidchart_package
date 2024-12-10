import React from "react";
import { MessagePayloads, MessageTypes, SelectionType } from "@quodsi/shared";
import { AppState } from "../../QuodsiApp";
import { ModelPanelAccordion } from "../../components/ModelPanelAccordion/ModelPanelAccordion";

export interface MessageHandlerDependencies {
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    setError: (error: string | null) => void;
    sendMessage: (type: MessageTypes, payload?: any) => void;
}

export const messageHandlers = {
    handleInitialState: (
        data: MessagePayloads[MessageTypes.INITIAL_STATE],
        deps: MessageHandlerDependencies
    ) => {
        const { setState } = deps;
        setState(prev => ({
            ...prev,
            modelStructure: data.modelStructure || { elements: [], hierarchy: {} },
            modelName: data.modelData?.name || "New Model",
            documentId: data.documentId,
            expandedNodes: new Set<string>(data.expandedNodes || []),
        }));
    },

    handleSelectionChanged: (
        data: MessagePayloads[MessageTypes.SELECTION_CHANGED],
        deps: MessageHandlerDependencies
    ) => {
        const { setState, sendMessage } = deps;
        setState(prev => ({
            ...prev,
            currentElement: data.elementData?.[0] || null,
            modelStructure: data.modelStructure || prev.modelStructure,
            expandedNodes: new Set<string>(data.expandedNodes || Array.from(prev.expandedNodes)),
        }));

        if (data.elementData?.[0]?.id) {
            sendMessage(MessageTypes.GET_ELEMENT_DATA, {
                elementId: data.elementData[0].id,
            });
        }
    },

    handleElementData: (
        data: MessagePayloads[MessageTypes.ELEMENT_DATA],
        deps: MessageHandlerDependencies
    ) => {
        const { setState } = deps;
        setState(prev => ({
            ...prev,
            currentElement: {
                data: data.data,
                metadata: data.metadata,
            },
            referenceData: data.referenceData || {},
        }));
    },

    handleUpdateSuccess: (
        data: MessagePayloads[MessageTypes.UPDATE_SUCCESS],
        deps: MessageHandlerDependencies
    ) => {
        const { setState } = deps;
        setState(prev => ({ ...prev, isProcessing: false }));
    },

    handleValidationResult: (
        data: MessagePayloads[MessageTypes.VALIDATION_RESULT],
        deps: MessageHandlerDependencies
    ) => {
        const { setState } = deps;
        setState(prev => ({
            ...prev,
            validationState: {
                summary: {
                    errorCount: data.messages.filter(m => m.type === "error").length,
                    warningCount: data.messages.filter(m => m.type === "warning").length,
                },
                messages: data.messages,
            },
        }));
    },

    handleError: (
        data: MessagePayloads[MessageTypes.ERROR],
        deps: MessageHandlerDependencies
    ) => {
        const { setState, setError } = deps;
        setState(prev => ({ ...prev, isProcessing: false }));
        setError(data.error);
    },
};