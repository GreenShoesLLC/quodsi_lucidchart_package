// src/services/messageHandlers/action/actionRequestHandlers.ts
import {
    ActionType,
    ActionRequest,
    MessageTypes,
    MessagePayloads,
    RunState,
    SimulationObjectType
} from "@quodsi/shared";
import { MessageHandlerDependencies, MessageHandler } from "./messageHandlers";

/**
 * Handler for ACTION_REQUEST messages.
 * Routes the request to the appropriate handler based on the actionType.
 */
export const handleActionRequest = (
    payload: ActionRequest,
    deps: MessageHandlerDependencies
): void => {
    console.log(`[ActionRequestHandlers] ACTION_REQUEST/${payload.actionType} received:`, payload.data);

    if (!payload.actionType) {
        console.error('[ActionRequestHandlers] Missing action type in request');
        return;
    }

    // Get the appropriate handler for this action type
    const handler = actionRequestHandlers[payload.actionType];
    if (handler) {
        handler(payload.data, deps);
    } else {
        console.warn(`[ActionRequestHandlers] No handler for action type: ${payload.actionType}`);
    }
};

/**
 * Map of handlers for each action request type.
 * Each handler processes a specific action type and performs the required operations.
 */
export const actionRequestHandlers: Record<ActionType, (data: any, deps: MessageHandlerDependencies) => void> = {
    [ActionType.CONVERT_PAGE]: (data, { setState }) => {
        console.log("[ActionRequestHandlers] Processing CONVERT_PAGE request");
        // Set processing state
        setState(prev => ({
            ...prev,
            isProcessing: true
        }));
        // The actual conversion will be handled by the extension
    },

    [ActionType.REMOVE_MODEL]: (data, { setState }) => {
        console.log("[ActionRequestHandlers] Processing REMOVE_MODEL request");
        // Set processing state
        setState(prev => ({
            ...prev,
            isProcessing: true
        }));
        // The actual model removal will be handled by the extension
    },

    [ActionType.UPDATE_ELEMENT_DATA]: (data, { setState }) => {
        console.log("[ActionRequestHandlers] Processing UPDATE_ELEMENT_DATA request");
        // Set processing state
        setState(prev => ({
            ...prev,
            isProcessing: true
        }));
        // The actual data update will be handled by the extension
    },

    [ActionType.CONVERT_ELEMENT]: (data, { setState }) => {
        console.log("[ActionRequestHandlers] Processing CONVERT_ELEMENT request");
        // Set processing state
        setState(prev => ({
            ...prev,
            isProcessing: true
        }));
        // The actual element conversion will be handled by the extension
    },

    [ActionType.VALIDATE_MODEL]: (data, { setState }) => {
        console.log("[ActionRequestHandlers] Processing VALIDATE_MODEL request");
        // Set validation state to pending/processing
        setState(prev => ({
            ...prev,
            isProcessing: true
        }));
        // The actual validation will be handled by the extension
    },

    [ActionType.SIMULATE_MODEL]: (data, { setState }) => {
        console.log("[ActionRequestHandlers] Processing SIMULATE_MODEL request");

        // Update UI state immediately to show the simulation is starting
        setState(prev => ({
            ...prev,
            isProcessing: true,
            simulationStatus: {
                ...prev.simulationStatus,
                pageStatus: {
                    ...(prev.simulationStatus?.pageStatus || {}),
                    hasContainer: true,
                    scenarios: [{
                        id: '00000000-0000-0000-0000-000000000000',
                        name: data?.scenarioName || 'Base Scenario',
                        reps: 1,
                        forecastDays: 30,
                        runState: RunState.Running,
                        type: SimulationObjectType.Scenario
                    }],
                    statusDateTime: new Date().toISOString()
                },
                isPollingSimState: true,
                lastChecked: new Date().toISOString(),
                errorMessage: null
            }
        }));

        // The actual simulation will be handled by the extension
    },

    [ActionType.SIMULATION_STATUS_CHECK]: (data, { setState }) => {
        console.log("[ActionRequestHandlers] Processing SIMULATION_STATUS_CHECK request");

        // Update the lastChecked timestamp
        setState(prev => ({
            ...prev,
            simulationStatus: {
                ...prev.simulationStatus,
                lastChecked: new Date().toISOString()
            }
        }));

        // The actual status check will be handled by the extension
    },

    [ActionType.CREATE_RESULTS_PAGE]: (data, { setState }) => {
        console.log("[ActionRequestHandlers] Processing CREATE_RESULTS_PAGE request");

        // Set processing state
        setState(prev => ({
            ...prev,
            isProcessing: true
        }));

        // The actual page creation will be handled by the extension
    },

    [ActionType.VIEW_SIMULATION_RESULTS]: (data, { setState }) => {
        console.log("[ActionRequestHandlers] Processing VIEW_SIMULATION_RESULTS request");

        // Set processing state
        setState(prev => ({
            ...prev,
            isProcessing: true
        }));

        // The actual results viewing will be handled by the extension
    },

    [ActionType.MARK_RESULTS_VIEWED]: (data, { setState }) => {
        console.log("[ActionRequestHandlers] Processing MARK_RESULTS_VIEWED request");

        // Optimistically update state
        setState(prev => ({
            ...prev,
            simulationStatus: {
                ...prev.simulationStatus,
                newResultsAvailable: false
            }
        }));

        // The actual marking of results will be handled by the extension
    }
};

/**
 * Action request handler for the main message handlers registry.
 */
export const actionRequestHandler: Partial<{
    [T in MessageTypes]: MessageHandler<T>;
}> = {
    [MessageTypes.ACTION_REQUEST]: (
        payload: MessagePayloads[MessageTypes.ACTION_REQUEST],
        deps: MessageHandlerDependencies
    ) => {
        handleActionRequest(payload, deps);
    }
};

/**
 * Helper function to send an action request.
 */
export function sendActionRequest(
    deps: MessageHandlerDependencies,
    actionType: ActionType,
    data?: any
): void {
    deps.sendMessage(MessageTypes.ACTION_REQUEST, {
        actionType,
        data
    });
}