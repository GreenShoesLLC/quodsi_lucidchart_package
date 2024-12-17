import {
    MessagePayloads,
    MessageTypes,
    ModelData,
    ValidationMessage,
    ExtensionMessaging,
    ModelItemData,
    SimulationObjectType
} from "@quodsi/shared";
import { AppState } from "../../QuodsiApp";

export interface MessageHandlerDependencies {
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    setError: (error: string | null) => void;
    sendMessage: <T extends MessageTypes>(type: T, payload?: MessagePayloads[T]) => void;
}

export type MessageHandler<T extends MessageTypes> = (
    payload: MessagePayloads[T],
    deps: MessageHandlerDependencies
) => void;

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
    [MessageTypes.REACT_APP_READY]: (data, { setState }) => {
        console.log("[MessageHandlers] Processing REACT_APP_READY");
        setState(prev => ({
            ...prev,
            isReady: true
        }));
    },
    [MessageTypes.SELECTION_CHANGED]: (data, { setState, sendMessage }) => {
        console.log("[MessageHandlers] Processing SELECTION_CHANGED:", data);

        setState(prev => {
            // Early return if no element data
            const elementData = data?.elementData?.[0];
            if (!elementData) {
                return {
                    ...prev,
                    currentElement: null,
                    modelStructure: data?.modelStructure || prev.modelStructure,
                    expandedNodes: new Set<string>(data?.expandedNodes || Array.from(prev.expandedNodes)),
                };
            }

            // If we already have this element selected with the same state, no need to update
            if (prev.currentElement?.data?.id === elementData.id &&
                prev.currentElement?.metadata?.isUnconverted === elementData.metadata?.isUnconverted) {
                return prev;
            }

            const currentElement: ModelItemData = {
                data: {
                    ...elementData.data,
                    id: elementData.id
                },
                metadata: elementData.metadata,
                isUnconverted: elementData.metadata?.isUnconverted,
                id: elementData.id,
                name: elementData.name
            };

            return {
                ...prev,
                currentElement,
                modelStructure: data.modelStructure || prev.modelStructure,
                expandedNodes: new Set<string>(data.expandedNodes || Array.from(prev.expandedNodes)),
            };
        });

        // Only request element data if we have a new element that needs data
        const elementData = data?.elementData?.[0];
        if (elementData?.id &&
            !elementData.metadata?.isUnconverted &&
            !elementData.data) {
            console.log("[MessageHandlers] Requesting element data for:", elementData.id);
            sendMessage(MessageTypes.GET_ELEMENT_DATA, {
                elementId: elementData.id,
            });
        }
    },

    [MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL]: (data, { setState }) => {
        console.log("[MessageHandlers] Processing SELECTION_CHANGED_PAGE_NO_MODEL:", data);
        setState(prev => ({
            ...prev,
            currentElement: null,
            modelStructure: null,
            modelName: "New Model",
            validationState: null,
            expandedNodes: new Set<string>(),
            // Set visibility states
            showModelName: false,
            showModelItemName: false,
            visibleSections: {
                header: true,      // Only header is visible
                validation: false,
                editor: false,
                modelTree: false
            }
        }));
    },

    [MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL]: (data, { setState }) => {
        console.log("[MessageHandlers] Processing SELECTION_CHANGED_PAGE_WITH_MODEL:", data);
        setState(prev => {
            const validationState = data.validationResult ? {
                summary: {
                    errorCount: data.validationResult.errorCount,
                    warningCount: data.validationResult.warningCount
                },
                messages: data.validationResult.messages
            } : null;

            // Ensure the modelItemData has the correct metadata.type
            const modelItemData = {
                ...data.modelItemData,
                metadata: {
                    ...data.modelItemData.metadata,
                    type: SimulationObjectType.Model
                }
            };

            return {
                ...prev,
                currentElement: modelItemData,
                modelStructure: data.modelStructure,
                expandedNodes: new Set<string>(data.expandedNodes || Array.from(prev.expandedNodes)),
                validationState,
                modelName: modelItemData.name || "Untitled Model",
                showModelName: true,           // Show model name
                showModelItemName: false,      // Don't show model item name since we're showing model name
                visibleSections: {             // Show all sections
                    header: true,
                    validation: true,
                    editor: true,
                    modelTree: true
                },
                isProcessing: false,
                error: null,
                documentId: data.selectionState.pageId || prev.documentId
            };
        });
    },

    [MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT]: (data, { setState, sendMessage }) => {
        console.log("[MessageHandlers] Processing SELECTION_CHANGED_SIMULATION_OBJECT:", data);

        setState(prev => {
            // If we already have this element selected with the same state, no need to update
            if (prev.currentElement?.data?.id === data.modelItemData.id) {
                return prev;
            }

            const currentElement: ModelItemData = {
                ...data.modelItemData,
                isUnconverted: false
            };

            return {
                ...prev,
                currentElement,
                modelStructure: data.modelStructure,
                expandedNodes: new Set<string>(data.expandedNodes || Array.from(prev.expandedNodes)),
                showModelName: true,          // Show model name
                showModelItemName: true,      // Show model item name
                visibleSections: {            // All sections visible
                    header: true,
                    validation: true,
                    editor: true,
                    modelTree: true
                }
            };
        });

        // Request detailed element data if not already present
        if (!data.modelItemData.data) {
            console.log("[MessageHandlers] Requesting element data for:", data.modelItemData.id);
            sendMessage(MessageTypes.GET_ELEMENT_DATA, {
                elementId: data.modelItemData.id,
            });
        }
    },

        [MessageTypes.SELECTION_CHANGED_MULTIPLE]: (data, deps) => {
            console.log("[MessageHandlers] Processing SELECTION_CHANGED_MULTIPLE:", data);

            // Check if the page has a model by examining the modelStructure
            // Handle undefined modelStructure case
            if (!data.modelStructure || !data.modelStructure.elements || Object.keys(data.modelStructure.elements).length === 0) {
                // Handle as SELECTION_CHANGED_PAGE_NO_MODEL
                const convertedPayload = {
                    pageId: data.multipleSelection.pageId
                };

                // Call the PAGE_NO_MODEL handler with full dependencies
                messageHandlers[MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL]?.(
                    convertedPayload,
                    deps
                );
            } else {
                // Handle as SELECTION_CHANGED_PAGE_WITH_MODEL
                // We know modelStructure exists at this point
                const modelElement = data.modelStructure.elements.find(e => e.id === "0_0");

                if (!modelElement) {
                    console.error("Could not find root model element");
                    return;
                }

                // Create a converted payload matching SELECTION_CHANGED_PAGE_WITH_MODEL format
                const convertedPayload: MessagePayloads[MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL] = {
                    selectionState: data.selectionState,
                    modelStructure: data.modelStructure,
                    expandedNodes: data.expandedNodes,
                    validationResult: data.validationResult,
                    pageSelection: {
                        pageId: data.multipleSelection.pageId
                    },
                    modelItemData: {
                        id: "0_0", // Root model ID
                        name: modelElement.name || "Untitled Model",
                        metadata: {
                            type: SimulationObjectType.Model,
                            version: "1.0",  // Add appropriate version
                            lastModified: new Date().toISOString(), // Current timestamp
                            id: "0_0",  // Same as the model ID
                            isUnconverted: false
                        },
                        data: {} // Empty data object for root model
                    }
                };

                // Call the PAGE_WITH_MODEL handler with full dependencies
                messageHandlers[MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL]?.(
                    convertedPayload,
                    deps
                );
            }
        },

        [MessageTypes.SELECTION_CHANGED_UNCONVERTED]: (data, { setState }) => {
            console.log("[MessageHandlers] Processing SELECTION_CHANGED_UNCONVERTED:", data);

            setState(prev => {
                const currentElement: ModelItemData = {
                    ...data.modelItemData,
                    isUnconverted: true
                };

                return {
                    ...prev,
                    currentElement,
                    modelStructure: data.modelStructure || prev.modelStructure,
                    expandedNodes: new Set<string>(data.expandedNodes || Array.from(prev.expandedNodes)),
                    showModelName: true,           // Show model name
                    showModelItemName: false,      // Don't show model item name
                    visibleSections: {             // Only show header
                        header: true,
                        validation: false,
                        editor: false,
                        modelTree: false
                    }
                };
            });
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
    }


} as const;

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

export function registerMessageHandlers(
    messaging: ExtensionMessaging,
    deps: MessageHandlerDependencies
): void {
    (Object.entries(messageHandlers) as [MessageTypes, MessageHandler<MessageTypes>][])
        .forEach(([type, handler]) => {
            registerHandler(messaging, type, handler, deps);
        });
}