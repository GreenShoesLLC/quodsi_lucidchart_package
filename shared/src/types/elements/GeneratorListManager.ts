import { ComponentListManager } from "./ComponentListManager";
import { Generator } from "./Generator";
import { SimulationObjectType } from "./SimulationObjectType";

export class GeneratorListManager extends ComponentListManager<Generator> {
    constructor() {
        super(SimulationObjectType.Generator);
    }
}