import { useEffect, useCallback } from 'react';
import { ExtensionMessaging, MessageTypes, PageStatus, RunState, SimulationObjectType } from '@quodsi/shared';
import axios from 'axios';

export const useSimulationStatus = (
    documentId: string,
    intervalSeconds: number = 30
) => {
    console.log("[useSimulationStatus] Starting with:", { documentId, intervalSeconds });
    const messaging = ExtensionMessaging.getInstance();
    const disabled = process.env.REACT_APP_DISABLE_SIMULATION_STATUS === 'true';
    const azureFunctionKey = process.env.REACT_APP_AZURE_STATUS_FUNCTION_KEY;

    const checkStatus = useCallback(async () => {
        if (disabled) return; // Early exit if disabled

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
            throw new Error("Missing REACT_APP_DATA_CONNECTOR_API_URL. Set this in your environment variables.");
        }

        const url = `${baseUrl}status/${documentId}?code=${azureFunctionKey}`; 

        if (process.env.NODE_ENV !== 'production') {
            console.log("[useSimulationStatus] Using base URL:", baseUrl);
        }

        try {
            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                withCredentials: false // Consider if this is still necessary
            });

            const data = response.data;
            console.log("[useSimulationStatus] API response:", data);

            const newStatus: PageStatus = {
                hasContainer: data.hasContainer,
                scenarios: data.scenarios.scenarios.map((s: {
                    id: string;
                    name: string;
                    runState: number;
                    reps?: number;
                    forecastDays?: number;
                }) => ({
                    ...s,
                    type: SimulationObjectType.Scenario,
                    reps: s.reps || 1,
                    forecastDays: s.forecastDays || 1,
                    runState: s.runState
                })),
                statusDateTime: new Date().toISOString()
            };

            messaging.sendMessage(MessageTypes.SIMULATION_STATUS_UPDATE, {
                pageStatus: newStatus
            });

        } catch (error) {
            console.error("[useSimulationStatus] Error checking status:", error);
            messaging.sendMessage(MessageTypes.SIMULATION_STATUS_ERROR, {
                errorMessage: 'Failed to check simulation status'
            });
        }
    }, [documentId, messaging, disabled, azureFunctionKey]);

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
    }, [checkStatus, intervalSeconds, disabled]); // Removed lucidApiService dependency
};