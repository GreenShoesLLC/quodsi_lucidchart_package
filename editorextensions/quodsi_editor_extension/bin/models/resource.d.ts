import { SimulationObjectType } from "./enums";
import { SimulationObject } from "./simulation_object";
export interface Resource extends SimulationObject {
    type: SimulationObjectType.Resource;
    capacity: number;
}
