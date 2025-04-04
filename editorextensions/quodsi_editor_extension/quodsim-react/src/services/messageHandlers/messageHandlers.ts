import {
    MessagePayloads,
    MessageTypes,
    ModelData,
    ValidationMessage,
    ExtensionMessaging,
    ModelItemData,
    SimulationObjectType,
    RunState
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
            },
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
                    validation: false,
                    editor: true,
                    modelTree: false
                },
                isProcessing: false,
                error: null,
                documentId: data.documentId
            };
        });
    },
    [MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT]: (payload, { setState }) => {
        console.log("[MessageHandlers] Processing SELECTION_CHANGED_SIMULATION_OBJECT - Initial payload:", {
            modelItemData: payload.modelItemData,
            data: payload.modelItemData?.data,
            timestamp: new Date().toISOString()
        });

        setState(prev => {
            // Create currentElement without modifying the type
            const currentElement = {
                ...payload.modelItemData,
                isUnconverted: false
            };

            const newState = {
                ...prev,
                diagramElementType: payload.simulationSelection.diagramElementType,
                currentElement,
                // Add a separate lastElementUpdate field
                lastElementUpdate: new Date().toISOString(),
                modelStructure: payload.modelStructure,
                expandedNodes: new Set<string>(payload.expandedNodes || Array.from(prev.expandedNodes)),
                referenceData: payload.referenceData || {
                    entities: [],
                    resources: []
                },
                validationState: payload.validationResult ? {
                    messages: [...(payload.validationResult.messages || [])],
                    summary: {
                        errorCount: payload.validationResult.errorCount,
                        warningCount: payload.validationResult.warningCount
                    },
                    isValid: payload.validationResult.isValid,
                    errorCount: payload.validationResult.errorCount,
                    warningCount: payload.validationResult.warningCount
                } : null,
                showModelName: true,
                showModelItemName: true,
                visibleSections: {
                    header: true,
                    validation: false,
                    editor: true,
                    modelTree: false
                },
                documentId: payload.documentId
            };

            console.log("[MessageHandlers] State update - Current vs New:", {
                previousId: prev.currentElement?.id,
                newId: currentElement.id,
                hasDataChanged: JSON.stringify(prev.currentElement?.data) !== JSON.stringify(currentElement.data),
                lastUpdate: newState.lastElementUpdate
            });

            return newState;
        });
    },
    [MessageTypes.SELECTION_CHANGED_MULTIPLE]: (payload, deps) => {
        console.log("[MessageHandlers] Processing SELECTION_CHANGED_MULTIPLE:", payload);

        // Check if the page has a model by examining the modelStructure
        // Handle undefined modelStructure case
        if (!payload.modelStructure || !payload.modelStructure.elements || Object.keys(payload.modelStructure.elements).length === 0) {
            // Handle as SELECTION_CHANGED_PAGE_NO_MODEL
            const convertedPayload = {
                pageId: payload.multipleSelection.pageId
            };

            // Call the PAGE_NO_MODEL handler with full dependencies
            messageHandlers[MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL]?.(
                convertedPayload,
                deps
            );
        } else {
            // Handle as SELECTION_CHANGED_PAGE_WITH_MODEL
            // We know modelStructure exists at this point
            const modelElement = payload.modelStructure.elements.find(e => e.id === "0_0");

            if (!modelElement) {
                console.error("Could not find root model element");
                return;
            }

            // Create a converted payload matching SELECTION_CHANGED_PAGE_WITH_MODEL format
            const convertedPayload: MessagePayloads[MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL] = {
                selectionState: payload.selectionState,
                modelStructure: payload.modelStructure,
                expandedNodes: payload.expandedNodes,
                validationResult: payload.validationResult,
                pageSelection: {
                    pageId: payload.multipleSelection.pageId
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
                },
                documentId: payload.documentId
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
    },
    [MessageTypes.SIMULATION_STARTED]: (
        payload: MessagePayloads[MessageTypes.SIMULATION_STARTED],
        { setState }: MessageHandlerDependencies
    ) => {
        console.log("[messageHandlers] SIMULATION_STARTED received:", payload);
        setState(prev => ({
            ...prev,
            simulationStatus: {
                ...prev.simulationStatus,
                pageStatus: {
                    ...(prev.simulationStatus?.pageStatus || {}),
                    hasContainer: false,
                    scenarios:[{
                        id: '00000000-0000-0000-0000-000000000000', // Replace with a unique identifier
                        name: 'Base Scenario', // Replace with the name of the scenario
                        reps:1,
                        forecastDays:30,
                        runState:RunState.Running,
                        type: SimulationObjectType.Scenario
                    }],
                    statusDateTime: new Date().toISOString()
                },
                isPollingSimState: true,
                lastChecked: new Date().toISOString()
            }
        }));
    },
    [MessageTypes.SIMULATION_STATUS_UPDATE]: (
        payload: MessagePayloads[MessageTypes.SIMULATION_STATUS_UPDATE],
        { setState }: MessageHandlerDependencies
    ) => {
        console.log("[messageHandlers] SIMULATION_STATUS_UPDATE received:", payload);
        setState(prev => ({
            ...prev,
            simulationStatus: {
                ...prev.simulationStatus,
                pageStatus: payload.pageStatus,
                isPollingSimState: true,
                lastChecked: new Date().toISOString()
            }
        }));
    },
    [MessageTypes.SIMULATION_STATUS_ERROR]: (
        payload: MessagePayloads[MessageTypes.SIMULATION_STATUS_ERROR],
        { setState }: MessageHandlerDependencies
    ) => {
        setState(prev => ({
            ...prev,
            simulationStatus: {
                ...prev.simulationStatus,
                errorMessage: payload.errorMessage,
                isPollingSimState: false
            }
        }));
    }
} as const;

export function registerHandler<T extends MessageTypes>(
    messaging: ExtensionMessaging,
    type: T,
    handler: MessageHandler<T>,
    deps: MessageHandlerDependencies
): void {
    // Keep track of last message timestamp and payload for each type
    const lastProcessed = {
        time: 0,
        payload: ''
    };

    messaging.onMessage(type, (payload: MessagePayloads[T]) => {
        const currentTime = Date.now();
        const currentPayload = JSON.stringify(payload);

        // For selection change messages, implement deduplication
        if (type === MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT) {
            // Ignore duplicate messages within 200ms window
            if (currentTime - lastProcessed.time < 200 &&
                lastProcessed.payload === currentPayload) {
                console.log(`[MessageHandlers] Skipping duplicate ${type} message at ${new Date().toISOString()}`, {
                    timeSinceLastMessage: currentTime - lastProcessed.time,
                    messageType: type
                });
                return;
            }
        }

        // Update tracking
        lastProcessed.time = currentTime;
        lastProcessed.payload = currentPayload;

        // Add debug logging (safely)
        console.log(`[MessageHandlers] Processing message ${type} at ${new Date().toISOString()}`);

        // Process the message
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