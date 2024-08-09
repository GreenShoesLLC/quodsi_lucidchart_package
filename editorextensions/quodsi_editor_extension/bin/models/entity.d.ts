import { SimulationObjectType } from "./enums";
import { SimulationObject } from "./simulation_object";
export interface Entity extends SimulationObject {
    type: SimulationObjectType.Entity;
}
