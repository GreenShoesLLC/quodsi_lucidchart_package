import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PageStatus } from '@quodsi/shared';


export const usePageStatus = (documentId: string, intervalSeconds: number = 30) => {
    const [currentStatus, setCurrentStatus] = useState<PageStatus | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    console.log(`usePageStatus hook initialized for documentId: ${documentId} with interval: ${intervalSeconds}s`);

    const checkStatus = useCallback(async () => {
        console.log(`[Status Check] Starting status check for document ${documentId}`);
        setIsChecking(true);
        setError(null);

        try {
            console.log(`[Status Check] Making API request to ${process.env.REACT_APP_API_URL}/Lucid/status/${documentId}`);
            const response = await axios.get(`${process.env.REACT_APP_API_URL}Lucid/status/${documentId}`);
            console.log('[Status Check] API response received:', response.data);

            const newStatus: PageStatus = {
                hasContainer: response.data.hasContainer,
                scenarios: response.data.scenarios || [],
                statusDateTime: new Date().toISOString()
            };
            console.log('[Status Check] Processed new status:', newStatus);

            // Send the status to the extension to update page custom data
            console.log('[Status Check] Sending status update to parent window');
            window.parent.postMessage({
                messagetype: 'updatePageStatus',
                data: newStatus
            }, '*');

            setCurrentStatus(newStatus);
            console.log('[Status Check] Status update complete');
        } catch (err) {
            const errorMessage = 'Failed to check status';
            console.error('[Status Check] Error:', err);
            console.error('[Status Check] Stack:', err instanceof Error ? err.stack : 'No stack trace available');
            setError(errorMessage);
        } finally {
            setIsChecking(false);
            console.log('[Status Check] Status check completed');
        }
    }, [documentId]);

    useEffect(() => {
        console.log('[Effect] Setting up status polling');

        // Initial check
        console.log('[Effect] Performing initial status check');
        checkStatus();

        // Set up polling
        console.log(`[Effect] Setting up ${intervalSeconds} second polling interval`);
        const intervalId = setInterval(checkStatus, intervalSeconds * 1000);

        // Cleanup
        return () => {
            console.log('[Effect] Cleaning up - clearing interval');
            clearInterval(intervalId);
        };
    }, [checkStatus, intervalSeconds]);

    return { currentStatus, isChecking, error };
};