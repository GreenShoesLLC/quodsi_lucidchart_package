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
    const azureFunctionKey = process.env.REACT_APP_AZURE_FUNCTION_KEY; 

    const checkStatus = useCallback(async () => {
        if (disabled) return; // Early exit if disabled

        if (!documentId) {
            console.log("[useSimulationStatus] No documentId provided");
            return;
        }

        // if (!azureFunctionKey) {
        //     console.error("[useSimulationStatus] Azure Function Key is missing. Check environment variables.");
        //     return;
        // }

        const env = process.env.DATA_CONNECTOR_ENV || 'local';
        console.log("[useSimulationStatus] DATA_CONNECTOR_ENV:", env);
        let baseUrl;

        switch (env) {
            case 'local':
                baseUrl = process.env.DATA_CONNECTOR_API_URL_LOCAL;
                break;
            case 'dev':
                baseUrl = process.env.DATA_CONNECTOR_API_URL_DEV;
                break;
            case 'test':
                baseUrl = process.env.DATA_CONNECTOR_API_URL_TEST;
                break;
            case 'prod':
                baseUrl = process.env.DATA_CONNECTOR_API_URL_PROD;
                break;
            default:
                console.error(`Invalid DATA_CONNECTOR_ENV: ${env}`);
                baseUrl = process.env.DATA_CONNECTOR_API_URL_LOCAL;
                break;
        }

        if (!baseUrl) {
            console.error(`No URL defined for DATA_CONNECTOR_ENV: ${env}`);
            baseUrl = "http://localhost:7071/api/"; // Provide a hard-coded default (or throw an error)
        }

        const url = `${baseUrl}status/${documentId}?code=${azureFunctionKey}`; // Construct URL here

        console.log("[useSimulationStatus] Making API call to:", url);

        try {
            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*', // Consider if these are still necessary
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // Consider if these are still necessary
                    'Access-Control-Allow-Headers': 'Content-Type' // Consider if these are still necessary
                },
                withCredentials: false // Consider if this is still necessary
            });

            const data = response.data;
            console.log("[useSimulationStatus] API response:", data);

            //... (Mapping functions mapNumericToRunState and mapStringToRunState remain the same)

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
    }, [documentId, messaging, disabled, azureFunctionKey]); // Add dependencies

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