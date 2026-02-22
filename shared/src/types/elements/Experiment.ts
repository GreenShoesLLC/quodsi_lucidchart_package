import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationRun } from "./SimulationRun";
import { SimulationObject } from "./SimulationObject";

export interface Experiment extends SimulationObject {
    simulationRuns: SimulationRun[];
    type: SimulationObjectType.Experiment;
}