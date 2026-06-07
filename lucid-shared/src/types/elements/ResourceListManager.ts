import { ComponentListManager } from "./ComponentListManager";
import { Resource } from "./Resource";
import { SimulationObjectType } from "./SimulationObjectType";

export class ResourceListManager extends ComponentListManager<Resource> {
    constructor() {
        super(SimulationObjectType.Resource);
    }
}