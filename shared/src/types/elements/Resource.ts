import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationObject } from "./SimulationObject";

export class Resource implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Resource;

    static createDefault(id: string): Resource {
        return new Resource(
            id,
            'New Resource',
            1 // capacity
        );
    }

    constructor(
        public id: string,
        public name: string,
        public capacity: number = 1
    ) { }
}