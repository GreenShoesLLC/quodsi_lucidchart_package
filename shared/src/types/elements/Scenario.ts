import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationObject } from "./SimulationObject";
import { RunState } from "./RunState";

export interface Scenario extends SimulationObject {
    reps: number;
    forecastDays: number;
    runState: RunState;
    type: SimulationObjectType.Scenario;
    // Add the new properties
    resultsLastUpdated?: string;
    resultsLastImported?: string;
    resultsViewed?: boolean;
}