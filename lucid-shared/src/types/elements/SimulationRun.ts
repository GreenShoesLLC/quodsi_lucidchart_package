import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationObject } from "./SimulationObject";
import { RunState } from "./RunState";

export interface SimulationRun extends SimulationObject {
    reps: number;
    forecastDays: number;
    runState: RunState;
    type: SimulationObjectType.Scenario;  // Keep enum value — it's the wire format
    // True when this run is for the baseline scenario. UI uses this to
    // surface the baseline run's state on the page-level Simulate button.
    // Replaces the legacy convention of detecting baseline by
    // id === '00000000-0000-0000-0000-000000000000'.
    isBaseline?: boolean;
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
