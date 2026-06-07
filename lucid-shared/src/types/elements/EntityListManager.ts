import { ComponentListManager } from "./ComponentListManager";
import { Entity } from "./Entity";
import { SimulationObjectType } from "./SimulationObjectType";

export class EntityListManager extends ComponentListManager<Entity> {
    constructor() {
        super(SimulationObjectType.Entity);
    }
}