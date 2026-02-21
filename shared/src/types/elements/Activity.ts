import { SimulationObjectType } from "./SimulationObjectType";
import { FlowNode } from "./FlowNode";
import { Duration } from "./Duration";
import { PeriodUnit } from "./PeriodUnit";
import { ConstantDistribution } from "./distributions";
import { ActivityFinancialProperties } from "./FinancialProperties";
import { FailureProperties } from "./FailureProperties";
import { ConnectType } from "./ConnectType";
import { Action } from "./actions";
import { EntitySourceConfig } from "./EntitySourceConfig";
import { createDelayWithResourceAction } from "./actions/DelayWithResourceAction";

export class Activity extends FlowNode {
    type: SimulationObjectType = SimulationObjectType.Activity;

    // ========== NEW ACTION SYSTEM ==========

    /**
     * Actions to perform when processing entities.
     * This is the new action-based system that replaces operationSteps.
     *
     * When actions is populated, it takes precedence over operationSteps
     * and pre/post processing state modifications.
     */
    actions: Action[] = [];

    /**
     * Optional entity source configuration for self-generating activities.
     * When set, this activity can generate its own entities without requiring
     * an upstream Generator.
     */
    sourceConfig?: EntitySourceConfig;

    /**
     * Financial properties for Phase 1 costing
     */
    financialProperties?: ActivityFinancialProperties;

    /**
     * Failure (MTBF/MTTR) properties for activity breakdowns
     */
    failureProperties?: FailureProperties;

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
        const defaultAction = createDelayWithResourceAction(defaultDuration);

        const activity = new Activity(
            id,
            'New Activity',
            1, // capacity
            999999, // inboundQueueCapacity
            999999, // outboundQueueCapacity
            [defaultAction], // actions
            x,
            y
        );

        return activity;
    }

    description: string = '';

    constructor(
        public id: string,
        public name: string,
        public capacity: number = 1,
        public inboundQueueCapacity: number = 1,
        public outboundQueueCapacity: number = 1,
        actions: Action[] = [],
        x: number = 0,
        y: number = 0
    ) {
        super();
        this.actions = actions;
        // Set location using inherited method
        this.setLocation(x, y);
    }

}