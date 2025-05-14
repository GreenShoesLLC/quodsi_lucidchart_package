import { useEffect, useCallback, useState } from 'react';
import { 
    ExtensionMessaging, 
    MessageTypes, 
    PageStatus, 
    RunState, 
    SimulationObjectType, 
    ActionType,
    ComponentLogger
} from '@quodsi/shared';
import axios from 'axios';

// Enhanced scenario type with result fields
interface EnhancedScenario {
    id: string;
    name: string;
    runState: RunState;
    reps?: number;
    forecastDays?: number;
    resultsLastUpdated?: string;
    resultsLastImported?: string;
    resultsViewed?: boolean;
}

// Define a constant for the logger prefix
const LOG_PREFIX = '[useSimulationStatus]';

export const useSimulationStatus = (
    documentId: string,
    intervalSeconds: number = 30
) => {
    ComponentLogger.log(LOG_PREFIX, 'Starting with:', { documentId, intervalSeconds });
    
    const messaging = ExtensionMessaging.getInstance();
    const disabled = process.env.REACT_APP_DISABLE_SIMULATION_STATUS === 'true';
    const azureFunctionKey = process.env.REACT_APP_AZURE_STATUS_FUNCTION_KEY;
    
    // Track if we have new results available
    const [newResultsAvailable, setNewResultsAvailable] = useState(false);

    const checkStatus = useCallback(async () => {
        ComponentLogger.log(LOG_PREFIX, 'checkStatus called with:', { 
            documentId, 
            disabled, 
            hasKey: !!azureFunctionKey 
        });
        
        if (disabled) {
            ComponentLogger.log(LOG_PREFIX, 'Status check is disabled');
            return;
        }

        if (!documentId) {
            ComponentLogger.log(LOG_PREFIX, 'No documentId provided');
            return;
        }

        if (!azureFunctionKey) {
            ComponentLogger.error(LOG_PREFIX, 'Azure Function Key is missing. Check environment variables.');
            messaging.sendMessage(MessageTypes.ACTION_REQUEST, {
                actionType: ActionType.SIMULATION_STATUS_CHECK,
                data: {
                    documentId,
                    errorMessage: "Azure Function Key is missing",
                    errorCode: 'MISSING_AZURE_FUNCTION_KEY'
                }
            });
            return;
        }

        const baseUrl = process.env.REACT_APP_DATA_CONNECTOR_API_URL;

        if (!baseUrl) {
            ComponentLogger.error(LOG_PREFIX, 'ERROR: REACT_APP_DATA_CONNECTOR_API_URL is not defined!');
            messaging.sendMessage(MessageTypes.ACTION_REQUEST, {
                actionType: ActionType.SIMULATION_STATUS_CHECK,
                data: {
                    documentId,
                    errorMessage: "Data Connector API URL is not defined",
                    errorCode: 'MISSING_DATA_CONNECTOR_URL'
                }
            });
            return;
        }

        const url = `${baseUrl}status/${documentId}?code=${azureFunctionKey}`; 
        ComponentLogger.log(LOG_PREFIX, 'Checking status URL:', url);

        try {
            ComponentLogger.log(LOG_PREFIX, 'Making API request to:', url);
            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                withCredentials: false
            });

            const data = response.data;
            ComponentLogger.log(LOG_PREFIX, 'API response:', data);
            ComponentLogger.log(LOG_PREFIX, 'Scenarios:', data.scenarios.scenarios);

            // DEBUG: Log each scenario's properties
            if (data.scenarios.scenarios) {
                data.scenarios.scenarios.forEach((s: any, i: number) => {
                    ComponentLogger.log(LOG_PREFIX, `Scenario ${i}:`, {
                        id: s.id,
                        name: s.name,
                        runState: s.runState,
                        resultsLastUpdated: s.resultsLastUpdated,
                        resultsLastImported: s.resultsLastImported,
                        resultsViewed: s.resultsViewed
                    });
                });
            }

            // Check if any scenarios have new results available
            const hasNewResults = (data.scenarios.scenarios || []).some((s: EnhancedScenario) => {
                const isCompleted = s.runState === RunState.RanSuccessfully;
                const hasLastUpdated = !!s.resultsLastUpdated;
                const hasLastImported = !!s.resultsLastImported;
                const notViewed = s.resultsViewed === false;
                
                ComponentLogger.log(LOG_PREFIX, `Scenario ${s.id} check:`, {
                    isCompleted,
                    hasLastUpdated,
                    hasLastImported,
                    notViewed,
                    result: isCompleted && hasLastUpdated && hasLastImported && notViewed
                });
                
                return isCompleted && hasLastUpdated && hasLastImported && notViewed;
            });
            
            ComponentLogger.log(LOG_PREFIX, 'Has new results:', hasNewResults);
            
            if (hasNewResults) {
                ComponentLogger.log(LOG_PREFIX, 'Setting newResultsAvailable to true');
                setNewResultsAvailable(true);
            }

            // Map the response data to the PageStatus format
            const newStatus: PageStatus = {
                hasContainer: data.hasContainer,
                scenarios: (data.scenarios.scenarios || []).map((s: {
                    id: string;
                    name: string;
                    runState: RunState;
                    reps?: number;
                    forecastDays?: number;
                    resultsLastUpdated?: string;
                    resultsLastImported?: string;
                    resultsViewed?: boolean;
                }) => ({
                    ...s,
                    type: SimulationObjectType.Scenario,
                    reps: s.reps || 1,
                    forecastDays: s.forecastDays || 1,
                    runState: s.runState,
                    // Include result fields for use in the UI
                    resultsLastUpdated: s.resultsLastUpdated,
                    resultsLastImported: s.resultsLastImported,
                    resultsViewed: s.resultsViewed
                })),
                statusDateTime: new Date().toISOString()
            };

            ComponentLogger.log(LOG_PREFIX, 'Sending ACTION_REQUEST for status check:', {
                actionType: ActionType.SIMULATION_STATUS_CHECK,
                data: {
                    documentId,
                    pageStatus: newStatus,
                    newResultsAvailable: hasNewResults
                }
            });
            
            messaging.sendMessage(MessageTypes.ACTION_REQUEST, {
                actionType: ActionType.SIMULATION_STATUS_CHECK,
                data: {
                    documentId,
                    scenarioId: newStatus.scenarios[0]?.id // Optional scenario ID
                }
            });

        } catch (error) {
            ComponentLogger.error(LOG_PREFIX, 'Error checking status:', error);
            
            // Safely access error properties
            const errorResponse = axios.isAxiosError(error) && error.response 
                ? error.response.data 
                : 'No response data';
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            ComponentLogger.error(LOG_PREFIX, 'Error details:', errorResponse);
            ComponentLogger.error(LOG_PREFIX, 'Error message:', errorMessage);
            
            // Send ACTION_REQUEST with error information
            messaging.sendMessage(MessageTypes.ACTION_REQUEST, {
                actionType: ActionType.SIMULATION_STATUS_CHECK,
                data: {
                    documentId,
                    errorMessage: `Failed to check simulation status: ${errorMessage}`,
                    errorCode: 'SIMULATION_STATUS_CHECK_ERROR'
                }
            });
        }
    }, [documentId, messaging, disabled, azureFunctionKey]);

    // Function to mark results as viewed
    const acknowledgeResults = useCallback(async (scenarioId?: string) => {
        if (!documentId || !azureFunctionKey) {
            ComponentLogger.error(LOG_PREFIX, 'Cannot acknowledge results - missing documentId or function key');
            messaging.sendMessage(MessageTypes.ACTION_REQUEST, {
                actionType: ActionType.MARK_RESULTS_VIEWED,
                data: {
                    documentId,
                    errorMessage: "Missing documentId or function key",
                    errorCode: 'MISSING_CREDENTIALS'
                }
            });
            return false;
        }

        try {
            const baseUrl = process.env.REACT_APP_DATA_CONNECTOR_API_URL;
            if (!baseUrl) {
                throw new Error("Missing REACT_APP_DATA_CONNECTOR_API_URL");
            }

            // Construct the URL for the mark-viewed endpoint
            let url = `${baseUrl}mark-viewed/${documentId}?code=${azureFunctionKey}`;
            if (scenarioId) {
                url += `&scenarioId=${scenarioId}`;
            }

            ComponentLogger.log(LOG_PREFIX, 'Marking results as viewed:', { documentId, scenarioId });
            
            // Call the mark-viewed endpoint
            const response = await axios.post(url, {}, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            });

            if (response.status === 200) {
                ComponentLogger.log(LOG_PREFIX, 'Successfully marked results as viewed:', response.data);
                setNewResultsAvailable(false);
                
                // Send ACTION_REQUEST to mark results as viewed
                messaging.sendMessage(MessageTypes.ACTION_REQUEST, {
                    actionType: ActionType.MARK_RESULTS_VIEWED,
                    data: {
                        documentId,
                        scenarioId
                    }
                });
                
                // Trigger an immediate status check to refresh the UI
                checkStatus();
                return true;
            } else {
                ComponentLogger.error(LOG_PREFIX, 'Failed to mark results as viewed:', response);
                messaging.sendMessage(MessageTypes.ACTION_REQUEST, {
                    actionType: ActionType.MARK_RESULTS_VIEWED,
                    data: {
                        documentId,
                        scenarioId,
                        errorMessage: "Failed to mark results as viewed",
                        errorCode: 'MARK_RESULTS_VIEWED_FAILED'
                    }
                });
                return false;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            ComponentLogger.error(LOG_PREFIX, 'Error marking results as viewed:', errorMessage);
            
            // Send ACTION_REQUEST with error information
            messaging.sendMessage(MessageTypes.ACTION_REQUEST, {
                actionType: ActionType.MARK_RESULTS_VIEWED,
                data: {
                    documentId,
                    scenarioId,
                    errorMessage,
                    errorCode: 'MARK_RESULTS_VIEWED_ERROR'
                }
            });
            
            return false;
        }
    }, [documentId, azureFunctionKey, checkStatus, messaging]);

    useEffect(() => {
        if (disabled) {
            ComponentLogger.log(LOG_PREFIX, 'Status updates are disabled');
            return;
        }

        ComponentLogger.log(LOG_PREFIX, 'Setting up interval');
        const intervalId = setInterval(checkStatus, intervalSeconds * 1000);
        checkStatus(); // Initial check

        return () => {
            ComponentLogger.log(LOG_PREFIX, 'Cleaning up interval');
            clearInterval(intervalId);
        };
    }, [checkStatus, intervalSeconds, disabled]);
    
    // Log the current state whenever it changes
    useEffect(() => {
        ComponentLogger.log(LOG_PREFIX, 'State updated:', { newResultsAvailable });
    }, [newResultsAvailable]);
    
    // Expose function to control logging
    const setLogging = useCallback((enabled: boolean) => {
        ComponentLogger.setEnabled(LOG_PREFIX, enabled);
    }, []);
    
    return {
        newResultsAvailable,
        acknowledgeResults,
        setLogging // Expose a way to enable/disable logging
    };
};