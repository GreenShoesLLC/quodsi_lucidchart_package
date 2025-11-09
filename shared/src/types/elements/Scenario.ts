import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationObject } from "./SimulationObject";
import { RunState } from "./RunState";

export interface Scenario extends SimulationObject {
    reps: number;
    forecastDays: number;
    runState: RunState;
    type: SimulationObjectType.Scenario;
    // Progress tracking
    currentReplication?: number;  // Current replication being executed (1 to reps)
    // Error fields (populated when runState === RanWithErrors)
    error?: string;  // User-friendly error message
    errorType?: string;  // Error category (VALIDATION_ERROR, RUNTIME_ERROR, TIMEOUT_ERROR, etc.)
    errorDetails?: string;  // Technical details/stack trace
    errorSuggestions?: string[];  // Actionable suggestions from Python runner
    // Timing fields (populated by Python runner)
    startTime?: string;  // ISO timestamp when simulation started
    endTime?: string;    // ISO timestamp when simulation completed
    metrics?: Record<string, any>;  // Performance and execution metrics
}