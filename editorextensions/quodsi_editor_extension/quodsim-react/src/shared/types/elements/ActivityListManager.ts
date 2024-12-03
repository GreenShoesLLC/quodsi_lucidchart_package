import { Activity } from "./Activity";
import { ComponentListManager } from "./ComponentListManager";

export class ActivityListManager extends ComponentListManager<Activity> {
    getByCapacityThreshold(minCapacity: number): Activity[] {
        return this.getAll().filter(activity => activity.capacity >= minCapacity);
    }
}