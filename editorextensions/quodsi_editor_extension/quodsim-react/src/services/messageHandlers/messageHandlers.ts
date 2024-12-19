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
    [MessageTypes.REACT_APP_READY]: (data, { setState }) => {
        console.log("[MessageHandlers] Processing REACT_APP_READY");
        setState(prev => ({
            ...prev,
            isReady: true
        }));
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

        [MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT]: (payload, { setState, sendMessage }) => {
            console.log("[MessageHandlers] Processing SELECTION_CHANGED_SIMULATION_OBJECT:", payload);
            setState(prev => {
                const currentElement: ModelItemData = {
                    ...payload.modelItemData,
                    isUnconverted: false,
                };

                return {
                    ...prev,
                    diagramElementType: payload.simulationSelection.diagramElementType,
                    currentElement,
                    modelStructure: payload.modelStructure,
                    expandedNodes: new Set<string>(payload.expandedNodes || Array.from(prev.expandedNodes)),
                    referenceData: payload.referenceData || {  // Use provided data or empty default
                        entities: [],
                        resources: []
                    },
                    showModelName: true,
                    showModelItemName: true,
                    visibleSections: {
                        header: true,
                        validation: true,
                        editor: true,
                        modelTree: true
                    }
                };
            });
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

        [MessageTypes.SELECTION_CHANGED_UNCONVERTED]: (payload, { setState }) => {
            console.log("[MessageHandlers] Processing SELECTION_CHANGED_UNCONVERTED:", payload);

            setState(prev => {
                const currentElement: ModelItemData = {
                    ...payload.modelItemData,
                    isUnconverted: true
                };

                return {
                    ...prev,
                    diagramElementType: payload.unconvertedSelection.diagramElementType,
                    currentElement,
                    modelStructure: payload.modelStructure || prev.modelStructure,
                    expandedNodes: new Set<string>(payload.expandedNodes || Array.from(prev.expandedNodes)),
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