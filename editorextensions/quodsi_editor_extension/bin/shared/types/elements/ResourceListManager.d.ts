import { Resource } from "./Resource";
import { ComponentListManager } from "./ComponentListManager";
export declare class ResourceListManager extends ComponentListManager<Resource> {
    getByCapacity(capacity: number): Resource[];
}
