import { SimulationObject } from "./SimulationObject";
import { SimulationObjectType } from "./SimulationObjectType";
export declare abstract class ComponentListManager<T extends SimulationObject> {
    protected items: Map<string, T>;
    private readonly type;
    constructor(type: SimulationObjectType);
    getNextName(): string;
    add(item: T): void;
    remove(id: string): void;
    get(id: string): T | undefined;
    getAll(): T[];
    clear(): void;
    size(): number;
}
//# sourceMappingURL=ComponentListManager.d.ts.map