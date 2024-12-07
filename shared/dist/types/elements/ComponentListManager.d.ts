import { SimulationObject } from "./SimulationObject";
export declare abstract class ComponentListManager<T extends SimulationObject> {
    protected items: Map<string, T>;
    constructor();
    add(item: T): void;
    remove(id: string): void;
    get(id: string): T | undefined;
    getAll(): T[];
    clear(): void;
    size(): number;
}
//# sourceMappingURL=ComponentListManager.d.ts.map