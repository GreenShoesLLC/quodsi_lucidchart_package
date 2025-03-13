import { useEffect, useCallback, useState } from 'react';
import { ExtensionMessaging, MessageTypes, PageStatus, RunState, SimulationObjectType } from '@quodsi/shared';
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

export const useSimulationStatus = (
    documentId: string,
    intervalSeconds: number = 30
) => {
    console.log("[useSimulationStatus] Starting with:", { documentId, intervalSeconds });
    const messaging = ExtensionMessaging.getInstance();
    const disabled = process.env.REACT_APP_DISABLE_SIMULATION_STATUS === 'true';
    const azureFunctionKey = process.env.REACT_APP_AZURE_STATUS_FUNCTION_KEY;
    
    // Track if we have new results available
    const [newResultsAvailable, setNewResultsAvailable] = useState(false);

    const checkStatus = useCallback(async () => {
        console.log("[useSimulationStatus] checkStatus called with:", { 
            documentId, 
            disabled, 
            hasKey: !!azureFunctionKey 
        });
        
        if (disabled) {
            console.log("[useSimulationStatus] Status check is disabled");
            return;
        }

        if (!documentId) {
            console.log("[useSimulationStatus] No documentId provided");
            return;
        }

        if (!azureFunctionKey) {
            console.error("[useSimulationStatus] Azure Function Key is missing. Check environment variables.");
            return;
        }

        const baseUrl = process.env.REACT_APP_DATA_CONNECTOR_API_URL;

        if (!baseUrl) {
            console.error("[useSimulationStatus] ERROR: REACT_APP_DATA_CONNECTOR_API_URL is not defined!");
            console.error("[useSimulationStatus] Available env vars:", process.env);
            return;
        }

        const url = `${baseUrl}status/${documentId}?code=${azureFunctionKey}`; 
        console.log("[useSimulationStatus] Checking status URL:", url);

        try {
            console.log("[useSimulationStatus] Making API request to:", url);
            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                withCredentials: false
            });

            const data = response.data;
            console.log("[useSimulationStatus] API response:", data);
            console.log("[useSimulationStatus] Scenarios:", data.scenarios.scenarios);

            // DEBUG: Log each scenario's properties
            if (data.scenarios.scenarios) {
                data.scenarios.scenarios.forEach((s: any, i: number) => {
                    console.log(`[useSimulationStatus] Scenario ${i}:`, {
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
                
                console.log(`[useSimulationStatus] Scenario ${s.id} check:`, {
                    isCompleted,
                    hasLastUpdated,
                    hasLastImported,
                    notViewed,
                    result: isCompleted && hasLastUpdated && hasLastImported && notViewed
                });
                
                return isCompleted && hasLastUpdated && hasLastImported && notViewed;
            });
            
            console.log("[useSimulationStatus] Has new results:", hasNewResults);
            
            if (hasNewResults) {
                console.log("[useSimulationStatus] Setting newResultsAvailable to true");
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

            console.log("[useSimulationStatus] Sending SIMULATION_STATUS_UPDATE with:", {
                pageStatus: newStatus,
                newResultsAvailable: hasNewResults
            });
            
            messaging.sendMessage(MessageTypes.SIMULATION_STATUS_UPDATE, {
                pageStatus: newStatus,
                newResultsAvailable: hasNewResults
            });

        } catch (error) {
            console.error("[useSimulationStatus] Error checking status:", error);
            
            // Safely access error properties
            const errorResponse = axios.isAxiosError(error) && error.response 
                ? error.response.data 
                : 'No response data';
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            console.error("[useSimulationStatus] Error details:", errorResponse);
            console.error("[useSimulationStatus] Error message:", errorMessage);
            
            messaging.sendMessage(MessageTypes.SIMULATION_STATUS_ERROR, {
                errorMessage: `Failed to check simulation status: ${errorMessage}`
            });
        }
    }, [documentId, messaging, disabled, azureFunctionKey]);

    // Function to mark results as viewed
    const acknowledgeResults = useCallback(async (scenarioId?: string) => {
        if (!documentId || !azureFunctionKey) {
            console.error("[useSimulationStatus] Cannot acknowledge results - missing documentId or function key");
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

            console.log("[useSimulationStatus] Marking results as viewed:", { documentId, scenarioId });
            
            // Call the mark-viewed endpoint
            const response = await axios.post(url, {}, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            });

            if (response.status === 200) {
                console.log("[useSimulationStatus] Successfully marked results as viewed:", response.data);
                setNewResultsAvailable(false);
                
                // Trigger an immediate status check to refresh the UI
                checkStatus();
                return true;
            } else {
                console.error("[useSimulationStatus] Failed to mark results as viewed:", response);
                return false;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("[useSimulationStatus] Error marking results as viewed:", errorMessage);
            return false;
        }
    }, [documentId, azureFunctionKey, checkStatus]);

    useEffect(() => {
        if (disabled) {
            console.log("[useSimulationStatus] Status updates are disabled");
            return;
        }

        console.log("[useSimulationStatus] Setting up interval");
        const intervalId = setInterval(checkStatus, intervalSeconds * 1000);
        checkStatus(); // Initial check

        return () => {
            console.log("[useSimulationStatus] Cleaning up interval");
            clearInterval(intervalId);
        };
    }, [checkStatus, intervalSeconds, disabled]);
    
    // Log the current state whenever it changes
    useEffect(() => {
        console.log("[useSimulationStatus] State updated:", { newResultsAvailable });
    }, [newResultsAvailable]);
    
    return {
        newResultsAvailable,
        acknowledgeResults
    };
};