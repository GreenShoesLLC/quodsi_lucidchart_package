import { PageStatus } from "@quodsi/lucid-shared";

/**
 * UI state for simulation polling
 * Renamed from SimulationStatus to avoid collision with SimulationStatus enum from @quodsi/lucid-shared
 */
export interface SimulationPollState {
    pageStatus: PageStatus | null;
    isPollingSimState: boolean;
    errorMessage: string | null;
    lastChecked: string | null;
    newResultsAvailable?: boolean;
}