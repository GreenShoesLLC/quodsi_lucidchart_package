// src/types/documentStatus.ts

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
    // New fields for results tracking
    resultsLastUpdated?: string;
    resultsLastImported?: string;
    resultsViewed?: boolean;
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