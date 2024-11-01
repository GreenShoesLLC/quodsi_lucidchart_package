import { SimulationObjectType } from "./enums/simulationObjectType";
import { SimulationObject } from "./simulation_object";
export interface Scenario extends SimulationObject {
    reps: number;
    forecastDays: number;
    runState: 'not run' | 'running' | 'ran with errors' | 'ran successfully';
    type: SimulationObjectType.Scenario;
}
