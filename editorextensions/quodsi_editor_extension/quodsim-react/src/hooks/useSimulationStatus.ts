// src/hooks/useSimulationStatus.ts
import { useEffect, useCallback, useMemo } from 'react';
import { ExtensionMessaging, MessageTypes, PageStatus, RunState } from '@quodsi/shared';
import { createLucidApiService } from '@quodsi/shared';

export const useSimulationStatus = (
    documentId: string,
    intervalSeconds: number = 30
) => {
    console.log("[useSimulationStatus] Starting with:", { documentId, intervalSeconds });
    const messaging = ExtensionMessaging.getInstance();
    const disabled = process.env.REACT_APP_DISABLE_SIMULATION_STATUS === 'true';

    // Create LucidApiService instance
    const lucidApiService = useMemo(() => {
        const baseUrl = process.env.REACT_APP_API_URL;
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

        if (!lucidApiService) {
            console.error("[useSimulationStatus] Service not initialized");
            return;
        }

        try {
            const data = await lucidApiService.getSimulationStatus(documentId);
            console.log("[useSimulationStatus] Received data:", data);

            const mapNumericToRunState = (state: number): RunState => {
                switch (state) {
                    case 1: return RunState.Running;
                    case 2: return RunState.RanWithErrors;
                    case 3: return RunState.RanSuccessfully;
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
                    runState: mapNumericToRunState(s.runState)
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
    }, [documentId, messaging, lucidApiService]);

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