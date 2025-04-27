import { SimulationObjectType } from "./SimulationObjectType";
import { PositionedSimulationObject } from "./PositionedSimulationObject";

export class Entity extends PositionedSimulationObject {
    type: SimulationObjectType = SimulationObjectType.Entity;

    static createDefault(
        id: string, 
        x: number = 0, 
        y: number = 0
    ): Entity {
        const entity = new Entity(
            id,
            'New Entity',
            x,
            y
        );

        return entity;
    }

    constructor(
        public id: string,
        public name: string,
        x: number = 0,
        y: number = 0
    ) { 
        super();
        // Set location using inherited method
        this.setLocation(x, y);
    }
}