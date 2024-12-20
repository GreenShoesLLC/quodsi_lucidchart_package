import { ComponentListManager } from "./ComponentListManager";
import { Activity } from "./Activity";
import { SimulationObjectType } from "./SimulationObjectType";

export class ActivityListManager extends ComponentListManager<Activity> {
    constructor() {
        super(SimulationObjectType.Activity);
    }
}