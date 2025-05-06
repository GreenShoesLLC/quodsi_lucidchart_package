// src/services/messageHandlers/action/actionResponseHandlers.ts
import {
    RunState,
    SimulationObjectType,
    ActionType,
    ActionResponse,
    MessageTypes,
    MessagePayloads,
    Scenario,
    ValidationState,
    PageStatus
} from "@quodsi/shared";
import { MessageHandlerDependencies, MessageHandler } from "./messageHandlers";

/**
 * Handler for ACTION_RESPONSE messages.
 * Routes the response to the appropriate handler based on the actionType.
 */
export const handleActionResponse = (
    payload: ActionResponse,
    deps: MessageHandlerDependencies
): void => {
    console.log(`[ActionResponseHandlers] ACTION_RESPONSE/${payload.actionType} received:`, payload.data);

    if (!payload.actionType) {
        console.error('[ActionResponseHandlers] Missing action type in response');
        return;
    }

    // Get the appropriate handler for this action type
    const handler = actionResponseHandlers[payload.actionType];
    if (handler) {
        handler(payload, deps);
    } else {
        console.warn(`[ActionResponseHandlers] No handler for action response type: ${payload.actionType}`);
    }
};

/**
 * Map of handlers for each action response type.
 * Each handler processes a specific action type response and updates the app state accordingly.
 */
export const actionResponseHandlers: Record<ActionType, (payload: ActionResponse, deps: MessageHandlerDependencies) => void> = {
    [ActionType.CONVERT_PAGE]: (payload, { setState }) => {
        console.log("[ActionResponseHandlers] Processing CONVERT_PAGE response");

        // Reset processing state regardless of success
        setState(prev => ({
            ...prev,
            isProcessing: false
        }));

        if (payload.success) {
            // For successful page conversion, we might want to update UI state
            setState(prev => ({
                ...prev,
                // The selection changed handler will update most state values
                // Just add any immediate feedback needed
                error: null
            }));
        } else {
            // For failed conversion, show error
            setState(prev => ({
                ...prev,
                error: payload.data?.errorMessage || "Failed to convert page"
            }));
        }
    },

    [ActionType.REMOVE_MODEL]: (payload, { setState }) => {
        console.log("[ActionResponseHandlers] Processing REMOVE_MODEL response");

        // Reset processing state regardless of success
        setState(prev => ({
            ...prev,
            isProcessing: false
        }));

        if (payload.success) {
            // Handle successful model removal
            setState(prev => ({
                ...prev,
                modelName: "New Model",
                currentElement: null,
                validationState: null,
                visibleSections: {
                    ...prev.visibleSections,
                    validation: false,
                    editor: false,
                    modelTree: false
                },
                error: null
            }));
        } else {
            // For failed removal, show error
            setState(prev => ({
                ...prev,
                error: payload.data?.errorMessage || "Failed to remove model"
            }));
        }
    },

    [ActionType.UPDATE_ELEMENT_DATA]: (payload, { setState }) => {
        console.log("[ActionResponseHandlers] Processing UPDATE_ELEMENT_DATA response");

        // Reset processing state regardless of success
        setState(prev => ({
            ...prev,
            isProcessing: false
        }));

        if (payload.success) {
            // Handle successful update
            setState(prev => ({
                ...prev,
                lastElementUpdate: new Date().toISOString(),
                error: null
            }));
        } else {
            // Handle error
            setState(prev => ({
                ...prev,
                error: payload.data?.errorMessage || "Failed to update element"
            }));
        }
    },

    [ActionType.CONVERT_ELEMENT]: (payload, { setState }) => {
        console.log("[ActionResponseHandlers] Processing CONVERT_ELEMENT response");

        // Reset processing state regardless of success
        setState(prev => ({
            ...prev,
            isProcessing: false
        }));

        if (!payload.success) {
            // Only handle errors - successful conversions will trigger selection changed
            setState(prev => ({
                ...prev,
                error: payload.data?.errorMessage || "Failed to convert element"
            }));
        }
    },

    [ActionType.VALIDATE_MODEL]: (payload, { setState }) => {
        console.log("[ActionResponseHandlers] Processing VALIDATE_MODEL response");

        // Reset processing state regardless of success
        setState(prev => ({
            ...prev,
            isProcessing: false
        }));

        if (payload.success && payload.data && payload.data.validationResult) {
            // Transform ValidationResult to ValidationState
            const validationState: ValidationState | null = payload.data.validationResult
                ? {
                    summary: {
                        errorCount: payload.data.validationResult.errorCount,
                        warningCount: payload.data.validationResult.warningCount
                    },
                    messages: payload.data.validationResult.messages
                }
                : null;

            setState(prev => ({
                ...prev,
                validationState,
                visibleSections: {
                    ...prev.visibleSections,
                    validation: true
                },
                error: null
            }));
        } else {
            // Handle error
            setState(prev => ({
                ...prev,
                error: payload.data?.errorMessage || "Validation failed"
            }));
        }
    },

    [ActionType.SIMULATE_MODEL]: (payload, { setState }) => {
        console.log("[ActionResponseHandlers] Processing SIMULATE_MODEL response");

        // Reset processing state regardless of success
        setState(prev => ({
            ...prev,
            isProcessing: false
        }));

        if (payload.success) {
            // Handle successful simulation start
            const newScenario: Scenario = {
                id: '00000000-0000-0000-0000-000000000000',
                name: 'Base Scenario',
                reps: 1,
                forecastDays: 30,
                runState: RunState.Running,
                type: SimulationObjectType.Scenario
            };

            const newPageStatus: PageStatus = {
                hasContainer: false,
                scenarios: [newScenario],
                statusDateTime: new Date().toISOString()
            };

            setState(prev => ({
                ...prev,
                simulationStatus: {
                    ...prev.simulationStatus,
                    pageStatus: newPageStatus,
                    isPollingSimState: true,
                    lastChecked: new Date().toISOString(),
                    errorMessage: null
                }
            }));
        } else {
            // Handle error
            setState(prev => ({
                ...prev,
                simulationStatus: {
                    ...prev.simulationStatus,
                    errorMessage: payload.data?.errorMessage || "Failed to start simulation",
                    isPollingSimState: false
                }
            }));
        }
    },

    [ActionType.SIMULATION_STATUS_CHECK]: (payload, { setState }) => {
        console.log("[ActionResponseHandlers] Processing SIMULATION_STATUS_CHECK response");

        if (payload.success) {
            // Robust null checks for payload.data and pageStatus
            const pageStatus = payload.data?.pageStatus ?? null;
            const newResultsAvailable = payload.data?.newResultsAvailable ?? false;

            setState(prev => ({
                ...prev,
                simulationStatus: {
                    ...prev.simulationStatus,
                    pageStatus,
                    isPollingSimState: true,
                    lastChecked: new Date().toISOString(),
                    errorMessage: null,
                    ...(newResultsAvailable ? { newResultsAvailable: true } : {})
                }
            }));
        } else {
            // Handle error with comprehensive fallback
            setState(prev => ({
                ...prev,
                simulationStatus: {
                    ...prev.simulationStatus,
                    errorMessage: payload.data?.errorMessage || "Failed to check simulation status",
                    isPollingSimState: false
                }
            }));
        }
    },

    [ActionType.CREATE_RESULTS_PAGE]: (payload, { setState }) => {
        console.log("[ActionResponseHandlers] Processing CREATE_RESULTS_PAGE response");

        // Reset processing state regardless of success
        setState(prev => ({
            ...prev,
            isProcessing: false
        }));

        if (!payload.success) {
            // Handle error
            setState(prev => ({
                ...prev,
                error: payload.data?.errorMessage || "Failed to create results page"
            }));
        }
    },

    [ActionType.VIEW_SIMULATION_RESULTS]: (payload, { setState }) => {
        console.log("[ActionResponseHandlers] Processing VIEW_SIMULATION_RESULTS response");

        // Reset processing state regardless of success
        setState(prev => ({
            ...prev,
            isProcessing: false
        }));

        if (payload.success) {
            // Mark results as viewed in UI state
            setState(prev => ({
                ...prev,
                simulationStatus: {
                    ...prev.simulationStatus,
                    newResultsAvailable: false,
                    errorMessage: null
                }
            }));
        } else {
            // Handle error
            setState(prev => ({
                ...prev,
                simulationStatus: {
                    ...prev.simulationStatus,
                    errorMessage: payload.data?.errorMessage || "Failed to view simulation results"
                }
            }));
        }
    },

    [ActionType.MARK_RESULTS_VIEWED]: (payload, { setState }) => {
        console.log("[ActionResponseHandlers] Processing MARK_RESULTS_VIEWED response");

        if (payload.success) {
            // Update UI to reflect results are acknowledged
            setState(prev => ({
                ...prev,
                simulationStatus: {
                    ...prev.simulationStatus,
                    newResultsAvailable: false,
                    errorMessage: null
                }
            }));
        } else {
            // Handle error
            setState(prev => ({
                ...prev,
                simulationStatus: {
                    ...prev.simulationStatus,
                    errorMessage: payload.data?.errorMessage || "Failed to mark results as viewed"
                }
            }));
        }
    }
};

/**
 * Action response handler for the main message handlers registry.
 */
export const actionResponseHandler: Partial<{
    [T in MessageTypes]: MessageHandler<T>;
}> = {
    [MessageTypes.ACTION_RESPONSE]: (
        payload: MessagePayloads[MessageTypes.ACTION_RESPONSE],
        deps: MessageHandlerDependencies
    ) => {
        handleActionResponse(payload, deps);
    }
};