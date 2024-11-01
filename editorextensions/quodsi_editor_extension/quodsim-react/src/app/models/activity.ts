import { SimulationObjectType } from "./enums/simulationObjectType";
import { OperationStep } from "./operationStep";

export class Activity {
    type: SimulationObjectType = SimulationObjectType.Activity;

    constructor(
        public id: string,
        public name: string,
        public capacity: number = 1,
        public inputBufferCapacity: number = Infinity,
        public outputBufferCapacity: number = Infinity,
        public operationSteps: OperationStep[] = []
    ) { }
}