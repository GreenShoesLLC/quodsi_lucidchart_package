import { ComponentListManager } from "./ComponentListManager";
import { Generator } from "./Generator";

export class GeneratorListManager extends ComponentListManager<Generator> {
    getByEntityType(entityType: string): Generator[] {
        return this.getAll().filter(generator => generator.entityType === entityType);
    }
}