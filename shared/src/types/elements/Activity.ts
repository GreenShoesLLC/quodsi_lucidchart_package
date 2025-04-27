import { SimulationObjectType } from "./SimulationObjectType";
import { createOperationStep, OperationStep } from "./OperationStep";
import { PositionedSimulationObject } from "./PositionedSimulationObject";
import { Duration } from "./Duration";
import { PeriodUnit } from "./PeriodUnit";
import { ConstantDistribution } from "./distributions";

export class Activity extends PositionedSimulationObject {
    type: SimulationObjectType = SimulationObjectType.Activity;

    static createDefault(
        id: string, 
        x: number = 0, 
        y: number = 0
    ): Activity {
        const defaultDuration = new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(1));
        const defaultOperationStep = createOperationStep(defaultDuration);

        const activity = new Activity(
            id,
            'New Activity',
            1, // capacity
            1, // inputBufferCapacity
            1, // outputBufferCapacity
            [defaultOperationStep], // operationSteps
        );

        // Set location using inherited method
        activity.setLocation(x, y);

        return activity;
    }

    constructor(
        public id: string,
        public name: string,
        public capacity: number = 1,
        public inputBufferCapacity: number = 1,
        public outputBufferCapacity: number = 1,
        public operationSteps: OperationStep[] = [],
        x: number = 0,
        y: number = 0
    ) { 
        super();
        // Set location using inherited method
        this.setLocation(x, y);
    }
}