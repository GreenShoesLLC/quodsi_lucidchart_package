import {
    MessagePayloads,
    MessageTypes,
    ModelData,
    ValidationMessage,
    ExtensionMessaging,
    ModelItemData,
    SimulationObjectType,
    RunState,
    SelectionType
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
    [MessageTypes.SELECTION_CHANGED]: (payload, { setState }) => {
        console.log("[MessageHandlers] Processing SELECTION_CHANGED:", payload);

        // Handle different selection types
        if (payload.selectionType === SelectionType.NONE) {
            // Page-level selection
            if (!payload.hasModel) {
                // This is equivalent to the previous SELECTION_CHANGED_PAGE_NO_MODEL
                console.log("[MessageHandlers] Handling as PAGE_NO_MODEL equivalent");
                setState(prev => ({
                    ...prev,
                    currentElement: null,
                    modelName: "New Model",
                    validationState: null,
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
            } else {
                // This is equivalent to the previous SELECTION_CHANGED_PAGE_WITH_MODEL
                console.log("[MessageHandlers] Handling as PAGE_WITH_MODEL equivalent");
                setState(prev => {
                    const validationState = payload.validationResult ? {
                        summary: {
                            errorCount: payload.validationResult.errorCount,
                            warningCount: payload.validationResult.warningCount
                        },
                        messages: payload.validationResult.messages
                    } : null;

                    // Get the model item data - ensure it's ModelItemData | null (not undefined)
                    let modelItemData: ModelItemData | null = null;
                    if (Array.isArray(payload.modelItemData)) {
                        const found = payload.modelItemData.find(item =>
                            item && item.metadata?.type === SimulationObjectType.Model);
                        modelItemData = found || null;
                    } else if (payload.modelItemData) {
                        modelItemData = payload.modelItemData;
                    }

                    return {
                        ...prev,
                        currentElement: modelItemData,
                        validationState,
                        modelName: modelItemData?.name || "Untitled Model",
                        showModelName: true,
                        showModelItemName: false,
                        visibleSections: {
                            header: true,
                            validation: true,
                            editor: true,
                            modelTree: true
                        },
                        isProcessing: false,
                        error: null,
                        documentId: payload.documentId
                    };
                });
            }
        } else if (payload.selectionType === SelectionType.MULTIPLE) {
            // Handle multiple selection
            console.log("[MessageHandlers] Handling MULTIPLE selection");

            // Check if the page has a model
            if (!payload.hasModel) {
                // Handle as no model
                setState(prev => ({
                    ...prev,
                    currentElement: null,
                    modelName: "New Model",
                    validationState: null,
                    showModelName: false,
                    showModelItemName: false,
                    visibleSections: {
                        header: true,
                        validation: false,
                        editor: false,
                        modelTree: false
                    },
                }));
            } else {
                // Handle as page with model but multiple items selected
                setState(prev => {
                    // Ensure modelItemData is ModelItemData | null (not undefined)
                    let modelItemData: ModelItemData | null = null;
                    if (Array.isArray(payload.modelItemData) && payload.modelItemData.length > 0) {
                        modelItemData = payload.modelItemData[0] || null;
                    }

                    return {
                        ...prev,
                        currentElement: modelItemData,
                        validationState: payload.validationResult ? {
                            summary: {
                                errorCount: payload.validationResult.errorCount,
                                warningCount: payload.validationResult.warningCount
                            },
                            messages: payload.validationResult.messages
                        } : null,
                        showModelName: true,
                        showModelItemName: false,
                        visibleSections: {
                            header: true,
                            validation: true,
                            editor: false,
                            modelTree: true
                        },
                        documentId: payload.documentId
                    };
                });
            }
        } else if (payload.selectionType === SelectionType.UNCONVERTED_ELEMENT) {
            // Handle unconverted element selection
            console.log("[MessageHandlers] Handling UNCONVERTED_ELEMENT selection");

            setState(prev => {
                // Ensure modelItemData is ModelItemData | null (not undefined)
                let modelItemData: ModelItemData | null = null;
                let currentElement: ModelItemData | null = null;

                if (payload.modelItemData) {
                    if (Array.isArray(payload.modelItemData) && payload.modelItemData.length > 0) {
                        modelItemData = payload.modelItemData[0];
                    } else if (!Array.isArray(payload.modelItemData)) {
                        modelItemData = payload.modelItemData;
                    }

                    if (modelItemData) {
                        currentElement = {
                            ...modelItemData,
                            isUnconverted: true
                        };
                    }
                }

                return {
                    ...prev,
                    diagramElementType: payload.diagramElementType,
                    currentElement,
                    showModelName: true,
                    showModelItemName: false,
                    visibleSections: {
                        header: true,
                        validation: false,
                        editor: false,
                        modelTree: false
                    }
                };
            });
        } else {
            // Handle simulation object selection (ACTIVITY, CONNECTOR, ENTITY, etc.)
            console.log("[MessageHandlers] Handling simulation object selection");

            setState(prev => {
                // Ensure modelItemData is ModelItemData | null (not undefined)
                let modelItemData: ModelItemData | null = null;
                let currentElement: ModelItemData | null = null;

                if (payload.modelItemData) {
                    if (Array.isArray(payload.modelItemData) && payload.modelItemData.length > 0) {
                        modelItemData = payload.modelItemData[0];
                    } else if (!Array.isArray(payload.modelItemData)) {
                        modelItemData = payload.modelItemData;
                    }

                    if (modelItemData) {
                        currentElement = {
                            ...modelItemData,
                            isUnconverted: false
                        };
                    }
                }

                return {
                    ...prev,
                    diagramElementType: payload.diagramElementType,
                    currentElement,
                    lastElementUpdate: new Date().toISOString(),
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
                        validation: Boolean(payload.hasModel),
                        editor: true,
                        modelTree: Boolean(payload.hasModel)
                    },
                    documentId: payload.documentId
                };
            });
        }
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
        if (type === MessageTypes.SELECTION_CHANGED) {
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