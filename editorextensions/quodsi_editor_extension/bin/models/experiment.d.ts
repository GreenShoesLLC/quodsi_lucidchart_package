import { SimulationObjectType } from "./enums";
import { Scenario } from "./scenario";
import { SimulationObject } from "./simulation_object";
export interface Experiment extends SimulationObject {
    scenarios: Scenario[];
    type: SimulationObjectType.Experiment;
}
