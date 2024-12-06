import { SimulationObject } from "./SimulationObject";

export abstract class ComponentListManager<T extends SimulationObject> {
    protected items: Map<string, T>;

    constructor() {
        this.items = new Map<string, T>();
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