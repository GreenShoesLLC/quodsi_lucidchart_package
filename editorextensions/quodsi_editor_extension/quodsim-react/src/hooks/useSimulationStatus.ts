// src/hooks/useSimulationStatus.ts
import { useEffect, useCallback } from 'react';
import { ExtensionMessaging, MessageTypes, PageStatus } from '@quodsi/shared';
import axios from 'axios';

export const useSimulationStatus = (
    documentId: string,
    intervalSeconds: number = 30
) => {
    const messaging = ExtensionMessaging.getInstance();
    const disabled = process.env.REACT_APP_DISABLE_SIMULATION_STATUS === 'true';
    const checkStatus = useCallback(async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}Lucid/status/${documentId}`
            );

            const newStatus: PageStatus = {
                hasContainer: response.data.hasContainer,
                scenarios: response.data.scenarios || [],
                statusDateTime: new Date().toISOString()
            };

            messaging.sendMessage(MessageTypes.SIMULATION_STATUS_UPDATE, {
                status: newStatus
            });
        } catch (error) {
            messaging.sendMessage(MessageTypes.SIMULATION_STATUS_ERROR, {
                error: 'Failed to check simulation status'
            });
        }
    }, [documentId, messaging]);

    useEffect(() => {
        if (disabled) return; // Early return if disabled
        const intervalId = setInterval(checkStatus, intervalSeconds * 1000);
        checkStatus(); // Initial check

        return () => clearInterval(intervalId);
    }, [checkStatus, intervalSeconds]);
};