import { SimulationObjectType } from "./enums";
import { SimulationObject } from "./simulation_object";

export interface Model extends SimulationObject {
    reps: number;
    forecastDays: number;
    type: SimulationObjectType.Model;
}
