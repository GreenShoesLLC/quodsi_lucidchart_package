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
}

export interface ScenarioStates {
    scenarios: ScenarioState[];
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