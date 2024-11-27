import { SimulationObjectType } from "./enums/simulationObjectType";
import { SimulationObject } from "./simulation_object";

export class Resource implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Resource;

    constructor(
        public id: string,
        public name: string,
        public capacity: number = 1
    ) { }
}