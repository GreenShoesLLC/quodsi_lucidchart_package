import {
    MessagePayloads,
    MessageTypes,
    ModelData,
    ValidationMessage,
    ExtensionMessaging
} from "@quodsi/shared";
import { AppState } from "../../QuodsiApp";

export interface MessageHandlerDependencies {
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    setError: (error: string | null) => void;
    sendMessage: <T extends MessageTypes>(type: T, payload?: MessagePayloads[T]) => void;
}

// Type-safe message handler type
export type MessageHandler<T extends MessageTypes> = (
    payload: MessagePayloads[T],
    deps: MessageHandlerDependencies
) => void;

// Type-safe message handlers map
export const messageHandlers: Partial<{
    [T in MessageTypes]: MessageHandler<T>;
}> = {
    [MessageTypes.INITIAL_STATE]: (data, { setState }) => {
        console.log("[MessageHandlers] Processing INITIAL_STATE:", data);
        setState(prev => ({
            ...prev,
            modelStructure: data.modelStructure || { elements: [], hierarchy: {} },
            modelName: (data.modelData as ModelData)?.name || "New Model",
            documentId: data.documentId,
            expandedNodes: new Set<string>(data.expandedNodes || []),
            isReady: true
        }));
    },

    [MessageTypes.SELECTION_CHANGED]: (data, { setState, sendMessage }) => {
        console.log("[MessageHandlers] Processing SELECTION_CHANGED:", data);
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

    [MessageTypes.TREE_STATE_SYNC]: (data, { setState }) => {
        console.log("[MessageHandlers] Processing TREE_STATE_SYNC:", data);
        setState(prev => ({
            ...prev,
            expandedNodes: new Set<string>(data.expandedNodes)
        }));
    },

    [MessageTypes.ELEMENT_DATA]: (data, { setState }) => {
        console.log("[MessageHandlers] Processing ELEMENT_DATA:", data);
        setState(prev => ({
            ...prev,
            currentElement: {
                data: data.data,
                metadata: data.metadata,
            },
            referenceData: data.referenceData || {}
        }));
    },

    [MessageTypes.VALIDATION_RESULT]: (data, { setState }) => {
        console.log("[MessageHandlers] Processing VALIDATION_RESULT:", data);
        setState(prev => ({
            ...prev,
            validationState: {
                summary: {
                    errorCount: data.messages.filter(
                        (m: ValidationMessage) => m.type === "error"
                    ).length,
                    warningCount: data.messages.filter(
                        (m: ValidationMessage) => m.type === "warning"
                    ).length,
                },
                messages: data.messages,
            },
        }));
    },

    [MessageTypes.UPDATE_SUCCESS]: (data, { setState }) => {
        console.log("[MessageHandlers] Processing UPDATE_SUCCESS:", data);
        setState(prev => ({
            ...prev,
            isProcessing: false
        }));
    },

    [MessageTypes.ERROR]: (data, { setState, setError }) => {
        console.error("[MessageHandlers] Received ERROR:", data);
        setState(prev => ({
            ...prev,
            isProcessing: false
        }));
        setError(data.error);
    },

    [MessageTypes.REACT_APP_READY]: (data, { setState }) => {
        console.log("[MessageHandlers] Processing REACT_APP_READY");
        setState(prev => ({
            ...prev,
            isReady: true
        }));
    }
} as const;

// Helper function for type-safe handler registration
export function registerHandler<T extends MessageTypes>(
    messaging: ExtensionMessaging,
    type: T,
    handler: MessageHandler<T>,
    deps: MessageHandlerDependencies
): void {
    messaging.onMessage(type, (payload: MessagePayloads[T]) => {
        handler(payload, deps);
    });
}

// Helper function to register all handlers
export function registerMessageHandlers(
    messaging: ExtensionMessaging,
    deps: MessageHandlerDependencies
): void {
    (Object.entries(messageHandlers) as [MessageTypes, MessageHandler<MessageTypes>][])
        .forEach(([type, handler]) => {
            registerHandler(messaging, type, handler, deps);
        });
}