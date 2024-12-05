import { ComponentListManager } from "./ComponentListManager";
import { Generator } from "./Generator";

export class GeneratorListManager extends ComponentListManager<Generator> {
    getByEntityId(entityId: string): Generator[] {
        return this.getAll().filter(generator => generator.entityId === entityId);
    }
}