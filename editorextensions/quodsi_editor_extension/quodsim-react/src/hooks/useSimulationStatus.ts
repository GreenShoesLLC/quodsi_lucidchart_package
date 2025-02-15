// src/hooks/useSimulationStatus.ts
import { useEffect, useCallback, useMemo } from 'react';
import { ExtensionMessaging, MessageTypes, PageStatus, RunState, SimulationObjectType } from '@quodsi/shared';
import { createLucidApiService } from '@quodsi/shared';
import axios from 'axios';

export const useSimulationStatus = (
    documentId: string,
    intervalSeconds: number = 30
) => {
    console.log("[useSimulationStatus] Starting with:", { documentId, intervalSeconds });
    const messaging = ExtensionMessaging.getInstance();
    const disabled = process.env.REACT_APP_DISABLE_SIMULATION_STATUS === 'true';

    // Create LucidApiService instance
    const lucidApiService = useMemo(() => {
        // const baseUrl = process.env.REACT_APP_API_URL;
        const baseUrl = 'https://dev-quodsi-webapp-01.azurewebsites.net/api/'
        console.log("[useSimulationStatus] Base URL:", baseUrl);

        if (!baseUrl) {
            console.error("[useSimulationStatus] REACT_APP_API_URL is not defined");
            return null;
        }

        try {
            const service = createLucidApiService(baseUrl);
            console.log("[useSimulationStatus] Service created successfully");
            return service;
        } catch (error) {
            console.error("[useSimulationStatus] Failed to create service:", error);
            return null;
        }
    }, []);

    const checkStatus = useCallback(async () => {
        if (!documentId) {
            console.log("[useSimulationStatus] No documentId provided");
            return;
        }

        try {

            const azureFunctionKey = process.env.REACT_APP_AZURE_FUNCTION_KEY;
            if (!azureFunctionKey) {
                console.error("Azure Function Key is missing. Check environment variables.");
                // Handle the error appropriately, perhaps disable the functionality
                // or display an error message to the user.
                return; // or throw an error
            }

            const url = `https://dev-quodsi-func-lucid-v1.azurewebsites.net/api/status/${documentId}?code=${azureFunctionKey}`;
            console.log("[useSimulationStatus] Making API call to:", url);

            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                withCredentials: false
            });

            const data = response.data;
            console.log("[useSimulationStatus] API response:", data);

            const mapNumericToRunState = (state: number): RunState => {
                switch (state) {
                    case 1: return RunState.Running;
                    case 2: return RunState.RanWithErrors;
                    case 3: return RunState.RanSuccessfully;
                    default: return RunState.NotRun;
                }
            };
            const mapStringToRunState = (state: string): RunState => {
                switch (state) {
                    case 'Running': return RunState.Running;
                    case 'RanWithErrors': return RunState.RanWithErrors;
                    case 'RAN_SUCCESSFULLY': return RunState.RanSuccessfully;
                    default: return RunState.NotRun;
                }
            };
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
    }, [documentId, messaging]);

    useEffect(() => {
        if (disabled) {
            console.log("[useSimulationStatus] Status updates are disabled");
            return;
        }

        if (!lucidApiService) {
            console.log("[useSimulationStatus] Service not available");
            return;
        }

        console.log("[useSimulationStatus] Setting up interval");
        const intervalId = setInterval(checkStatus, intervalSeconds * 1000);
        checkStatus(); // Initial check

        return () => {
            console.log("[useSimulationStatus] Cleaning up interval");
            clearInterval(intervalId);
        };
    }, [checkStatus, intervalSeconds, disabled, lucidApiService]);
};