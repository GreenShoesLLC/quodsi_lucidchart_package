// src/types/documentStatus.ts

/**
 * SYNC WITH: @quodsi/shared/src/types/elements/RunState.ts
 *
 * Data connector cannot import shared package due to dependency constraints.
 * When updating this enum, also update the shared version.
 */
export enum RunState {
    NotRun = 'NOT_RUN',
    Running = 'RUNNING',
    RanWithErrors = 'RAN_WITH_ERRORS',
    RanSuccessfully = 'RAN_SUCCESSFULLY'
}

export interface ScenarioState {
    id: string;
    runState: RunState;
    name: string;
    reps?: number;
    forecastDays?: number;
    seed?: number;
    type?: string;
    // Progress tracking fields
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
}

export interface ScenarioStates {
    scenarios: ScenarioState[];
    lastUpdated?: string;
}

export interface DocumentStatusResponse {
    hasContainer: boolean;
    scenarios: ScenarioStates;
    statusDateTime: string;
}

export interface ErrorResponse {
    message: string;
    details?: string[];
}