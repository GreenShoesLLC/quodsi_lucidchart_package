import { Activity } from "./Activity";
import { ComponentListManager } from "./ComponentListManager";
export declare class ActivityListManager extends ComponentListManager<Activity> {
    getByCapacityThreshold(minCapacity: number): Activity[];
}
