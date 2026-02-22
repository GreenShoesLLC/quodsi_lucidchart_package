// src/types/scenarios.ts
/**
 * SYNC WITH: @quodsi/shared/src/quodsi-messaging/simulationRun/simulationRunMessages.ts (SimulationRunInfo)
 *
 * Data connector cannot import shared package due to dependency constraints.
 * When updating these interfaces, also update the shared version.
 */

import { RunState } from "./documentStatus";

export interface SimulationRunDownloadInfo {
    zipUrl: string;
    excelUrl: string;
    fileSizeBytes: number;
    fileSizeMB: string;
    expiresAt: string;
}

export interface SimulationRunInfo {
    id: string;
    name: string;
    runState: RunState;
    reps: number;
    runClockPeriod: number;
    runClockPeriodUnit: string;
    simulationTimeType: string;
    completedAt?: string;
    hasResults: boolean;
    downloadInfo?: SimulationRunDownloadInfo;
    // Progress tracking
    currentReplication?: number;
    // Error fields (populated when runState === RAN_WITH_ERRORS)
    error?: string;  // User-friendly error message
    errorType?: string;  // Error category (VALIDATION_ERROR, RUNTIME_ERROR, TIMEOUT_ERROR, etc.)
    errorDetails?: string;  // Technical details/stack trace
    errorSuggestions?: string[];  // Actionable suggestions from Python runner
    // Timing fields (populated by Python runner)
    startTime?: string;  // ISO timestamp when simulation started
    endTime?: string;    // ISO timestamp when simulation completed
    metrics?: Record<string, any>;  // Performance and execution metrics
    // Scenario definition association (which scenario definition was used for this run)
    scenarioDefinitionId?: string;
    scenarioDefinitionName?: string;
}
