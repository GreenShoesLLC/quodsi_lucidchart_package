import { ComponentListManager } from "./ComponentListManager";
import { Resource } from "./Resource";
import { ResourceRequirement } from "./ResourceRequirement";
import { SimulationObjectType } from "./SimulationObjectType";

export class ResourceRequirementListManager extends ComponentListManager<ResourceRequirement> {
    constructor() {
        super(SimulationObjectType.ResourceRequirement);
    }
}