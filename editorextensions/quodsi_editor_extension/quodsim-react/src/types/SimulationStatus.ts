import { PageStatus } from "@quodsi/shared";

export interface SimulationStatus {
    pageStatus: PageStatus | null;
    isPollingSimState: boolean;
    errorMessage: string | null;
    lastChecked: string | null;
}