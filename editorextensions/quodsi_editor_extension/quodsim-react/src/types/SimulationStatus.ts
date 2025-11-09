import { PageStatus } from "@quodsi/shared";

/**
 * UI state for simulation polling
 * Renamed from SimulationStatus to avoid collision with SimulationStatus enum from @quodsi/shared
 */
export interface SimulationPollState {
    pageStatus: PageStatus | null;
    isPollingSimState: boolean;
    errorMessage: string | null;
    lastChecked: string | null;
    newResultsAvailable?: boolean;
}