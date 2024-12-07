import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationObject } from "./SimulationObject";

export class Entity implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Entity;

    static createDefault(id: string): Entity {
        return new Entity(
            id,
            'New Entity'
        );
    }

    constructor(
        public id: string,
        public name: string,
    ) { }
}