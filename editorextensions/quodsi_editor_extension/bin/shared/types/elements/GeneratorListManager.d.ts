import { ComponentListManager } from "./ComponentListManager";
import { Generator } from "./Generator";
export declare class GeneratorListManager extends ComponentListManager<Generator> {
    getByEntityType(entityType: string): Generator[];
}
