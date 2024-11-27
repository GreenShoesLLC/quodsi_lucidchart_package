import { PageProxy } from 'lucid-extension-sdk';
import { PageStatus } from '../models/pageStatus';
export declare class PageStatusManager {
    private page;
    private onStatusChange?;
    private static readonly PRIOR_STATUS_KEY;
    private static readonly CURRENT_STATUS_KEY;
    private pollingInterval;
    constructor(page: PageProxy, onStatusChange?: ((prior: PageStatus | null, current: PageStatus) => void) | undefined);
    startMonitoring(intervalSeconds?: number): Promise<void>;
    stopMonitoring(): void;
    private checkAndUpdateStatus;
    private getCurrentStatus;
    compareStatuses(): {
        newScenarios: Scenario[];
        changedScenarios: Scenario[];
    };
    private getPriorStatus;
}
