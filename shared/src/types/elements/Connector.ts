import { SimulationObjectType } from "./SimulationObjectType";
import { OperationStep } from "./OperationStep";
import { FlowNode } from "./FlowNode";
import { StateCondition } from "./StateCondition";
import { StateModification } from "./StateModification";
import { Action } from "./actions";
import { ActionType } from "./actions/ActionType";
import { DelayWithResourceAction } from "./actions/DelayWithResourceAction";

export class Connector extends FlowNode {
    type: SimulationObjectType = SimulationObjectType.Connector;

    // ========== LOCATION PROPERTIES ==========

    // Source and target location properties
    sourceX: number = 0;
    sourceY: number = 0;
    targetX: number = 0;
    targetY: number = 0;

    // ========== NEW FIELDS ==========

    /**
     * Actions to perform when an entity traverses this connector.
     * When populated, takes precedence over legacy operationSteps and stateModifications.
     */
    actions: Action[] = [];

    /**
     * Destination unique ID (new field name, replaces targetId)
     * When set, takes precedence over targetId.
     */
    destinationUniqueId?: string;

    /**
     * Priority when multiple connectors lead to the same destination.
     * Lower numbers = higher priority.
     */
    destinationPriority?: number;

    // ========== ROUTING CONDITION FIELDS ==========

    /**
     * Entity template routing - optional field for ENTITY_TEMPLATE ConnectType
     */
    entityTemplateUniqueId?: string;

    /**
     * State condition routing - optional field for STATE_CONDITION ConnectType
     */
    stateCondition?: StateCondition;

    // ========== LEGACY FIELDS ==========

    /**
     * @deprecated Use actions[] with AssignAction instead.
     * State modifications during routing.
     */
    stateModifications: StateModification[] = [];

    /**
     * @deprecated Use actions[] instead.
     * Operation steps during transit.
     */
    public operationSteps: OperationStep[] = [];

    /**
     * @deprecated Use destinationUniqueId instead.
     * ID of the target node.
     */
    public targetId: string = "";

    static createDefault(
        id: string,
        sourceX: number = 0,
        sourceY: number = 0,
        targetX: number = 0,
        targetY: number = 0
    ): Connector {
        const connector = new Connector(
            id,
            'New Connector',
            '', // sourceId
            '', // targetId (legacy)
            1, // weight
            [] // operationSteps (legacy)
        );

        // Set source and target coordinates
        connector.sourceX = sourceX;
        connector.sourceY = sourceY;
        connector.targetX = targetX;
        connector.targetY = targetY;

        // Set midpoint as default location
        connector.setLocation(
            (sourceX + targetX) / 2,
            (sourceY + targetY) / 2
        );

        return connector;
    }

    constructor(
        public id: string,
        public name: string,
        public sourceId: string,
        targetId: string,
        public weight: number = 1,
        operationSteps: OperationStep[] = [],
        sourceX: number = 0,
        sourceY: number = 0,
        targetX: number = 0,
        targetY: number = 0,
        x: number = 0,
        y: number = 0
    ) {
        super();

        // Set legacy fields
        this.targetId = targetId;
        this.operationSteps = operationSteps;

        // Set source and target coordinates
        this.sourceX = sourceX;
        this.sourceY = sourceY;
        this.targetX = targetX;
        this.targetY = targetY;

        // Set location to midpoint by default
        this.setLocation(
            x || (sourceX + targetX) / 2,
            y || (sourceY + targetY) / 2
        );
    }

    /**
     * Gets the effective destination unique ID.
     * If destinationUniqueId is set, returns that.
     * Otherwise, returns targetId for backward compatibility.
     */
    getEffectiveDestinationUniqueId(): string {
        return this.destinationUniqueId ?? this.targetId;
    }

    /**
     * Gets the effective actions for this connector.
     * If actions[] is populated, returns that.
     * Otherwise, converts legacy operationSteps to actions.
     */
    getEffectiveActions(): Action[] {
        if (this.actions.length > 0) {
            return this.actions;
        }
        // Convert legacy operationSteps to DelayWithResourceAction
        return this.operationSteps.map(step =>
            Connector.convertOperationStepToAction(step)
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
     * Update source location
     */
    setSourceLocation(x: number, y: number): void {
        this.sourceX = x;
        this.sourceY = y;

        // Recalculate midpoint
        this.setLocation(
            (this.sourceX + this.targetX) / 2,
            (this.sourceY + this.targetY) / 2
        );
    }

    /**
     * Update target location
     */
    setTargetLocation(x: number, y: number): void {
        this.targetX = x;
        this.targetY = y;

        // Recalculate midpoint
        this.setLocation(
            (this.sourceX + this.targetX) / 2,
            (this.sourceY + this.targetY) / 2
        );
    }
}