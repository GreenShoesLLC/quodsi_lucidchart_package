import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationObject } from "./SimulationObject";

export class Resource implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Resource;

    constructor(
        public id: string,
        public name: string,
        public capacity: number = 1
    ) { }
}