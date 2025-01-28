// src/hooks/useSimulationStatus.ts
import { useEffect, useCallback } from 'react';
import { ExtensionMessaging, MessageTypes, PageStatus, RunState } from '@quodsi/shared';
import axios from 'axios';

export const useSimulationStatus = (
    documentId: string,
    intervalSeconds: number = 30
) => {
    console.log("[useSimulationStatus] Starting with:", { documentId, intervalSeconds });
    const messaging = ExtensionMessaging.getInstance();
    const disabled = process.env.REACT_APP_DISABLE_SIMULATION_STATUS === 'true';
    const checkStatus = useCallback(async () => {
        if (!documentId) {
            console.log("[useSimulationStatus] Skipping check - no documentId");
            return;
        }
        try {
            const url = `${process.env.REACT_APP_API_URL}Lucid/status/${documentId}`;
            console.log("[useSimulationStatus] Making API call to:", url);

            const response = await axios.get(url);
            console.log("[useSimulationStatus] API response:", response.data);
            const mapNumericToRunState = (state: number): RunState => {
                switch (state) {
                    case 1: return RunState.Running;
                    case 2: return RunState.RanWithErrors;
                    case 3: return RunState.RanSuccessfully;
                    default: return RunState.NotRun;
                }
            };
            const newStatus: PageStatus = {
                hasContainer: response.data.hasContainer,
                scenarios: response.data.scenarios.scenarios.map((s: {
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

            
            console.log("[useSimulationStatus] newStatus.scenarios:", {
                scenarios: newStatus.scenarios,
                isArray: Array.isArray(newStatus.scenarios)
            }
            );
            console.log("[useSimulationStatus] Constructed PageStatus:", newStatus);
            messaging.sendMessage(MessageTypes.SIMULATION_STATUS_UPDATE, {
                pageStatus: newStatus
            });
        } catch (error) {
            console.error("[useSimulationStatus] API call failed:", error);
            messaging.sendMessage(MessageTypes.SIMULATION_STATUS_ERROR, {
                errorMessage: 'Failed to check simulation status'
            });
        }
    }, [documentId, messaging]);

    useEffect(() => {
        if (disabled) return; // Early return if disabled
        const intervalId = setInterval(checkStatus, intervalSeconds * 1000);
        checkStatus(); // Initial check

        return () => clearInterval(intervalId);
    }, [checkStatus, intervalSeconds, disabled]);
};