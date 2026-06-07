import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationObject } from "./SimulationObject";
import { RunState } from "./RunState";
export interface SimulationRun extends SimulationObject {
    reps: number;
    forecastDays: number;
    runState: RunState;
    type: SimulationObjectType.Scenario;
    isBaseline?: boolean;
    currentReplication?: number;
    error?: string;
    errorType?: string;
    errorDetails?: string;
    errorSuggestions?: string[];
    startTime?: string;
    endTime?: string;
    metrics?: Record<string, any>;
}
//# sourceMappingURL=SimulationRun.d.ts.map