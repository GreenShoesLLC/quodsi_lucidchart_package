import { SimulationObjectType } from "./SimulationObjectType";
import { createOperationStep, OperationStep } from "./OperationStep";
import { SimulationObject } from "./SimulationObject";
import { Connector } from "./Connector";
import { Duration } from "./Duration";
import { PeriodUnit } from "./PeriodUnit";
import { DurationType } from "./DurationType";

export class Activity implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Activity;

    static createDefault(id: string): Activity {
        const defaultDuration = new Duration(1, PeriodUnit.MINUTES, DurationType.CONSTANT);
        const defaultOperationStep = createOperationStep(defaultDuration);

        return new Activity(
            id,
            'New Activity',
            1, // capacity
            1, // inputBufferCapacity
            1, // outputBufferCapacity
            [defaultOperationStep], // operationSteps
        );
    }

    constructor(
        public id: string,
        public name: string,
        public capacity: number = 1,
        public inputBufferCapacity: number = 1,
        public outputBufferCapacity: number = 1,
        public operationSteps: OperationStep[] = [],
    ) { }
}