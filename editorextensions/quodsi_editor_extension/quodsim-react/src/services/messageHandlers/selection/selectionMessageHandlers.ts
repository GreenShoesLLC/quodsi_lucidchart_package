import {
    MessagePayloads,
    MessageTypes,
    ValidationMessage,
    ModelItemData,
    SimulationObjectType,
    SelectionType
} from "@quodsi/shared";
import { AppState } from "../../../QuodsiApp";
import { MessageHandlerDependencies, MessageHandler } from "../messageHandlers";

/**
 * Selection-specific message handlers
 */
export const selectionMessageHandlers: Partial<{
    [T in MessageTypes]: MessageHandler<T>;
}> = {
    [MessageTypes.SELECTION_CHANGED]: (payload, { setState }) => {
        console.log("[SelectionMessageHandlers] Processing SELECTION_CHANGED:", payload);

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
                        isProcessing: false,
                        error: null,
                        documentId: payload.documentId
                    };
                });
            }
        } else if (payload.selectionType === SelectionType.MULTIPLE) {
            // Handle multiple selection
            console.log("[SelectionMessageHandlers] Handling MULTIPLE selection");

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
            console.log("[SelectionMessageHandlers] Handling UNCONVERTED_ELEMENT selection");

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
            console.log("[SelectionMessageHandlers] Handling simulation object selection");

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
        console.log("[SelectionMessageHandlers] Processing VALIDATION_RESULT:", data);
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
        console.log("[SelectionMessageHandlers] Processing UPDATE_SUCCESS:", data);
        setState(prev => ({
            ...prev,
            isProcessing: false
        }));
    },

    [MessageTypes.ERROR]: (data, { setState, setError }) => {
        console.error("[SelectionMessageHandlers] Received ERROR:", data);
        setState(prev => ({
            ...prev,
            isProcessing: false
        }));
        setError(data.error);
    }
};