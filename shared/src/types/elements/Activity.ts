import { SimulationObjectType } from "./SimulationObjectType";
import { createOperationStep, OperationStep } from "./OperationStep";
import { SimulationObject } from "./SimulationObject";
import { Duration } from "./Duration";
import { PeriodUnit } from "./PeriodUnit";
import { ConstantDistribution } from "./distributions";

export class Activity implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Activity;

    static createDefault(id: string): Activity {
        const defaultDuration = new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(1));
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