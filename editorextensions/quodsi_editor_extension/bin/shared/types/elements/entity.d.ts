import { SimulationObjectType } from "./enums/simulationObjectType";
import { SimulationObject } from "./simulation_object";
export declare class Entity implements SimulationObject {
    id: string;
    name: string;
    type: SimulationObjectType;
    constructor(id: string, name: string);
}
