import { SimulationObjectType } from "./SimulationObjectType";
import { Scenario } from "./Scenario";
import { SimulationObject } from "./SimulationObject";
export interface Experiment extends SimulationObject {
    scenarios: Scenario[];
    type: SimulationObjectType.Experiment;
}
