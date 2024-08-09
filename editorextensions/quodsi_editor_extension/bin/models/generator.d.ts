import { SimulationObjectType } from "./enums";
import { SimulationObject } from "./simulation_object";
export interface Generator extends SimulationObject {
    type: SimulationObjectType.Generator;
}
