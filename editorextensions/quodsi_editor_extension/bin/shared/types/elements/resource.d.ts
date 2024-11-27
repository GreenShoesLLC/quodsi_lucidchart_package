import { SimulationObjectType } from "./enums/simulationObjectType";
import { SimulationObject } from "./simulation_object";
export declare class Resource implements SimulationObject {
    id: string;
    name: string;
    capacity: number;
    type: SimulationObjectType;
    constructor(id: string, name: string, capacity?: number);
}
