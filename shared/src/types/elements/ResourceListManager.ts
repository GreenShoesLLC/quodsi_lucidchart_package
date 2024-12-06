import { Resource } from "./Resource";
import { ComponentListManager } from "./ComponentListManager";

export class ResourceListManager extends ComponentListManager<Resource> {
    getByCapacity(capacity: number): Resource[] {
        return this.getAll().filter(resource => resource.capacity === capacity);
    }
}