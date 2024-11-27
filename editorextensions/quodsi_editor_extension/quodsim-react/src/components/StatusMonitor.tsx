import React, { useEffect } from 'react';
import { usePageStatus } from '../hooks/usePageStatus';

interface Props {
    documentId: string;
}

export const StatusMonitor: React.FC<Props> = ({ documentId }) => {
    console.log(`[StatusMonitor] Initializing for document: ${documentId}`);

    const { currentStatus, isChecking, error } = usePageStatus(documentId);

    useEffect(() => {
        console.log('[StatusMonitor] Component mounted');
        return () => {
            console.log('[StatusMonitor] Component unmounting');
        };
    }, []);

    useEffect(() => {
        if (currentStatus) {
            console.log('[StatusMonitor] Status updated:', {
                hasContainer: currentStatus.hasContainer,
                scenarioCount: currentStatus.scenarios.length,
                lastUpdated: currentStatus.statusDateTime
            });
        }
    }, [currentStatus]);

    useEffect(() => {
        if (error) {
            console.error('[StatusMonitor] Error state changed:', error);
        }
    }, [error]);

    useEffect(() => {
        console.log('[StatusMonitor] Checking state changed:', isChecking);
    }, [isChecking]);

    console.log('[StatusMonitor] Preparing to render', {
        isChecking,
        hasStatus: !!currentStatus,
        hasError: !!error
    });

    if (error) {
        console.error('[StatusMonitor] Rendering error state');
        return <div className="text-red-500">Error checking status: {error}</div>;
    }

    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <span>Status: </span>
                {isChecking ? (
                    <span className="text-blue-500">Checking...</span>
                ) : (
                    <span className="text-green-500">Up to date</span>
                )}
            </div>
            
            {currentStatus && (
                <div className="space-y-2">
                    <div>
                        Has Container: {currentStatus.hasContainer ? 'Yes' : 'No'}
                    </div>
                    <div>
                        Scenarios: {currentStatus.scenarios.length}
                    </div>
                    <div>
                        Last Updated: {new Date(currentStatus.statusDateTime).toLocaleString()}
                    </div>
                </div>
            )}
        </div>
    );
};