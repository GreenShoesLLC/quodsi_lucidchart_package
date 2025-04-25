import {
    MessageTypes,
    ValidationMessage,
    ModelItemData,
    SimulationObjectType,
    SelectionType
} from "@quodsi/shared";
import { MessageHandler } from "../messageHandlers";

/**
 * Selection-specific message handlers
 */
export const selectionMessageHandlers: Partial<{
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
                        documentId: payload.documentId
                    };
                });
            }
        } else if (payload.selectionType === SelectionType.MULTIPLE) {
            // Existing handling for multiple selection type (unchanged)
            // Placeholder comment to remind you to copy the existing implementation
            console.log("[SelectionMessageHandlers] Multiple selection handling");
            return setState(prev => ({
                ...prev,
                // Ensure error is null if undefined
                error: payload.error ?? null,
                isProcessing
            }));
        } else if (payload.selectionType === SelectionType.UNCONVERTED_ELEMENT) {
            // Existing handling for unconverted element selection type
            // Placeholder comment to remind you to copy the existing implementation
            console.log("[SelectionMessageHandlers] Unconverted element selection handling");
            return setState(prev => ({
                ...prev,
                // Ensure error is null if undefined
                error: payload.error ?? null,
                isProcessing
            }));
        } else {
            // Existing handling for simulation object selection
            // Placeholder comment to remind you to copy the existing implementation
            console.log("[SelectionMessageHandlers] Simulation object selection handling");
            return setState(prev => ({
                ...prev,
                // Ensure error is null if undefined
                error: payload.error ?? null,
                isProcessing
            }));
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