import {
    MessageTypes,
    ValidationMessage,
    ModelItemData,
    SimulationObjectType,
    SelectionType
} from "@quodsi/shared";
import { MessageHandler } from "./messageHandlers";

/**
 * Selection-specific message handlers
 */
export const selectionMessageHandlersOld: Partial<{
    [T in MessageTypes]: MessageHandler<T>;
}> = {
    [MessageTypes.SELECTION_CHANGED]: (payload, { setState, setError }) => {
        console.log("[SelectionMessageHandlers] Processing SELECTION_CHANGED:", payload);

        // Handle error message if present
        if (payload.error) {
            console.error("[SelectionMessageHandlers] Received error:", payload.error);
            setError(payload.error);
        }

        // Handle processing state
        const isProcessing = payload.isProcessing ?? false;

        // Handle different selection types
        if (payload.selectionType === SelectionType.NONE) {
            // Page-level selection
            if (!payload.hasModel) {
                // This is equivalent to the previous SELECTION_CHANGED_PAGE_NO_MODEL
                console.log("[SelectionMessageHandlers] Handling as PAGE_NO_MODEL equivalent");
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
                    isProcessing,
                    // Ensure error is null if undefined
                    error: payload.error ?? null
                }));
            } else {
                // This is equivalent to the previous SELECTION_CHANGED_PAGE_WITH_MODEL
                console.log("[SelectionMessageHandlers] Handling as PAGE_WITH_MODEL equivalent");
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
                        isProcessing,
                        // Ensure error is null if undefined
                        error: payload.error ?? null,
                        documentId: payload.documentId,
                        // Reset needsInitialization flag when a model exists
                        needsInitialization: false
                    };
                });
            }
        } else if (payload.selectionType === SelectionType.MULTIPLE) {
            // Multiple selection - show no editor
            console.log("[SelectionMessageHandlers] Multiple selection handling");
            setState(prev => ({
                ...prev,
                currentElement: null,
                showModelName: true,
                showModelItemName: false,
                visibleSections: {
                    ...prev.visibleSections,
                    editor: false
                },
                // Ensure error is null if undefined
                error: payload.error ?? null,
                isProcessing,
                // Reset needsInitialization flag for element selections
                needsInitialization: false
            }));
        } else if (payload.selectionType === SelectionType.UNCONVERTED_ELEMENT) {
            // Unconverted element - show a special prompt
            console.log("[SelectionMessageHandlers] Unconverted element selection handling");
            setState(prev => ({
                ...prev,
                currentElement: payload.modelItemData ?
                    (Array.isArray(payload.modelItemData) ? payload.modelItemData[0] : payload.modelItemData) :
                    null,
                showModelName: true,
                showModelItemName: true,
                visibleSections: {
                    ...prev.visibleSections,
                    editor: false
                },
                // Ensure error is null if undefined
                error: payload.error ?? null,
                isProcessing,
                // Reset needsInitialization flag for element selections
                needsInitialization: false
            }));
        } else if (payload.selectionType === SelectionType.CONNECTOR) {
            // Connector element selected
            console.log("[SelectionMessageHandlers] Connector selection handling");
            setState(prev => {
                // Get the connector item data
                let connectorData: ModelItemData | null = null;
                if (Array.isArray(payload.modelItemData)) {
                    connectorData = payload.modelItemData[0] || null;
                } else if (payload.modelItemData) {
                    connectorData = payload.modelItemData;
                }

                return {
                    ...prev,
                    currentElement: connectorData,
                    showModelName: true,
                    showModelItemName: true,
                    visibleSections: {
                        ...prev.visibleSections,
                        editor: true
                    },
                    error: payload.error ?? null,
                    isProcessing,
                    documentId: payload.documentId,
                    // Reset needsInitialization flag for element selections
                    needsInitialization: false
                };
            });
        } else {
            // Any other simulation object (ACTIVITY, ENTITY, GENERATOR, RESOURCE)
            console.log(`[SelectionMessageHandlers] ${payload.selectionType} selection handling`);
            setState(prev => {
                // Get the item data
                let itemData: ModelItemData | null = null;
                if (Array.isArray(payload.modelItemData)) {
                    itemData = payload.modelItemData[0] || null;
                } else if (payload.modelItemData) {
                    itemData = payload.modelItemData;
                }

                return {
                    ...prev,
                    currentElement: itemData,
                    showModelName: true,
                    showModelItemName: true,
                    visibleSections: {
                        ...prev.visibleSections,
                        editor: true
                    },
                    error: payload.error ?? null,
                    isProcessing,
                    documentId: payload.documentId,
                    // Reset needsInitialization flag for element selections
                    needsInitialization: false
                };
            });
        }
    },

    [MessageTypes.VALIDATION_RESULT]: (data, { setState }) => {
        console.log("[SelectionMessageHandlers] Processing VALIDATION_RESULT (deprecated):", data);
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
            // Explicitly set error to null
            error: null
        }));
    }
};