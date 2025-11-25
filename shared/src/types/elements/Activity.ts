import { SimulationObjectType } from "./SimulationObjectType";
import { createOperationStep, OperationStep } from "./OperationStep";
import { PositionedSimulationObject } from "./PositionedSimulationObject";
import { Duration } from "./Duration";
import { PeriodUnit } from "./PeriodUnit";
import { ConstantDistribution } from "./distributions";
import { StateModification } from "./StateModification";
import { ActivityFinancialProperties } from "./FinancialProperties";
import { ConnectType } from "./ConnectType";

export class Activity extends PositionedSimulationObject {
    type: SimulationObjectType = SimulationObjectType.Activity;

    /**
     * State modifications to apply before processing entities
     */
    preProcessingStateModifications: StateModification[] = [];

    /**
     * State modifications to apply after processing entities
     */
    postProcessingStateModifications: StateModification[] = [];

    /**
     * Financial properties for Phase 1 costing
     */
    financialProperties?: ActivityFinancialProperties;

    /**
     * Connect type for routing decisions from this activity
     */
    connectType: ConnectType = ConnectType.Probability;

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
            999999, // inputBufferCapacity
            999999, // outputBufferCapacity
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