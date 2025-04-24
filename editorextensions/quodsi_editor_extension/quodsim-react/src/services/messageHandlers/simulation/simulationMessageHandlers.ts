import {
    MessagePayloads,
    MessageTypes,
    RunState,
    SimulationObjectType
} from "@quodsi/shared";
import { AppState } from "../../../QuodsiApp";
import { MessageHandlerDependencies, MessageHandler } from "../messageHandlers";

/**
 * Simulation-specific message handlers
 */
export const simulationMessageHandlers: Partial<{
    [T in MessageTypes]: MessageHandler<T>;
}> = {
    [MessageTypes.SIMULATION_STARTED]: (
        payload: MessagePayloads[MessageTypes.SIMULATION_STARTED],
        { setState }: MessageHandlerDependencies
    ) => {
        console.log("[SimulationMessageHandlers] SIMULATION_STARTED received:", payload);
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
        console.log("[SimulationMessageHandlers] SIMULATION_STATUS_UPDATE received:", payload);
        setState(prev => ({
            ...prev,
            simulationStatus: {
                ...prev.simulationStatus,
                pageStatus: payload.pageStatus,
                isPollingSimState: true,
                lastChecked: new Date().toISOString()
            }
        }));

        // Handle new results being available if specified in the payload
        if (payload.newResultsAvailable) {
            console.log(
                "[SimulationMessageHandlers] Setting newResultsAvailable to true from message"
            );
            setState(prev => ({
                ...prev,
                simulationStatus: {
                    ...prev.simulationStatus,
                    newResultsAvailable: true,
                }
            }));
        }
    },

    [MessageTypes.SIMULATION_STATUS_ERROR]: (
        payload: MessagePayloads[MessageTypes.SIMULATION_STATUS_ERROR],
        { setState }: MessageHandlerDependencies
    ) => {
        console.log("[SimulationMessageHandlers] SIMULATION_STATUS_ERROR received:", payload);
        setState(prev => ({
            ...prev,
            simulationStatus: {
                ...prev.simulationStatus,
                errorMessage: payload.errorMessage,
                isPollingSimState: false
            }
        }));
    },

    [MessageTypes.SIMULATION_RESULTS_ACKNOWLEDGED]: (
        payload: MessagePayloads[MessageTypes.SIMULATION_RESULTS_ACKNOWLEDGED],
        { setState }: MessageHandlerDependencies
    ) => {
        console.log("[SimulationMessageHandlers] SIMULATION_RESULTS_ACKNOWLEDGED received:", payload);
        setState(prev => ({
            ...prev,
            simulationStatus: {
                ...prev.simulationStatus,
                newResultsAvailable: false
            }
        }));
    },

    [MessageTypes.VIEW_SIMULATION_RESULTS]: (
        payload: MessagePayloads[MessageTypes.VIEW_SIMULATION_RESULTS],
        { setState }: MessageHandlerDependencies
    ) => {
        console.log("[SimulationMessageHandlers] VIEW_SIMULATION_RESULTS received:", payload);
        // Mark results as viewed in UI state
        setState(prev => ({
            ...prev,
            simulationStatus: {
                ...prev.simulationStatus,
                newResultsAvailable: false
            }
        }));
    }
};