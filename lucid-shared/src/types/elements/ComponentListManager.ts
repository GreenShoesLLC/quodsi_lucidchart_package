import { SimulationObject } from "./SimulationObject";
import { SimulationObjectType } from "./SimulationObjectType";

export abstract class ComponentListManager<T extends SimulationObject> {
    protected items: Map<string, T>;
    private readonly type: SimulationObjectType;

    constructor(type: SimulationObjectType) {
        this.items = new Map<string, T>();
        this.type = type;
    }

    public getNextName(): string {
        return `${this.type} ${this.items.size + 1}`;
    }

    add(item: T): void {
        this.items.set(item.id, item);
    }

    remove(id: string): void {
        this.items.delete(id);
    }

    get(id: string): T | undefined {
        return this.items.get(id);
    }

    getAll(): T[] {
        return Array.from(this.items.values());
    }

    clear(): void {
        this.items.clear();
    }

    size(): number {
        return this.items.size;
    }
}