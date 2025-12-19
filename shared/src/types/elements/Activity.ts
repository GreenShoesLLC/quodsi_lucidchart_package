import { SimulationObjectType } from "./SimulationObjectType";
import { createOperationStep, OperationStep } from "./OperationStep";
import { FlowNode } from "./FlowNode";
import { Duration } from "./Duration";
import { PeriodUnit } from "./PeriodUnit";
import { ConstantDistribution } from "./distributions";
import { StateModification } from "./StateModification";
import { ActivityFinancialProperties } from "./FinancialProperties";
import { ConnectType } from "./ConnectType";
import { Action } from "./actions";
import { EntitySourceConfig } from "./EntitySourceConfig";
import { ActionType } from "./actions/ActionType";
import { DelayWithResourceAction, createDelayWithResourceAction } from "./actions/DelayWithResourceAction";

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

    // ========== LEGACY FIELDS (for backward compatibility during migration) ==========

    /**
     * @deprecated Use actions[] instead. This field will be removed in a future version.
     * State modifications to apply before processing entities.
     */
    preProcessingStateModifications: StateModification[] = [];

    /**
     * @deprecated Use actions[] instead. This field will be removed in a future version.
     * State modifications to apply after processing entities.
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

    /**
     * @deprecated Use actions[] instead. This field will be removed in a future version.
     */
    public operationSteps: OperationStep[] = [];

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

    /**
     * Gets the effective actions for this activity.
     * If actions[] is populated, returns that.
     * Otherwise, converts legacy operationSteps to actions.
     */
    getEffectiveActions(): Action[] {
        if (this.actions.length > 0) {
            return this.actions;
        }
        // Convert legacy operationSteps to DelayWithResourceAction
        return this.operationSteps.map(step =>
            Activity.convertOperationStepToAction(step)
        );
    }

    /**
     * Converts a legacy OperationStep to a DelayWithResourceAction
     */
    static convertOperationStepToAction(step: OperationStep): DelayWithResourceAction {
        return {
            actionType: ActionType.DELAY_WITH_RESOURCE,
            duration: step.duration,
            resourceRequirementId: step.requirementId,
            keepResource: step.keepResource ?? false,
            stateModifications: step.stateModifications ?? []
        };
    }

    /**
     * Converts an array of legacy OperationSteps to Actions
     */
    static convertOperationStepsToActions(steps: OperationStep[]): Action[] {
        return steps.map(step => Activity.convertOperationStepToAction(step));
    }
}