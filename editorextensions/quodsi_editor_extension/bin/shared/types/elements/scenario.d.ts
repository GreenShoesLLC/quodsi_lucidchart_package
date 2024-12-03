import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationObject } from "./SimulationObject";
export interface Scenario extends SimulationObject {
    reps: number;
    forecastDays: number;
    runState: 'not run' | 'running' | 'ran with errors' | 'ran successfully';
    type: SimulationObjectType.Scenario;
}
