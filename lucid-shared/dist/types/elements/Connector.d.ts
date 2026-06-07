import { SimulationObjectType } from "./SimulationObjectType";
import { FlowNode } from "./FlowNode";
import { StateCondition } from "./StateCondition";
import { StateModification } from "./StateModification";
import { Action } from "./actions";
export declare class Connector extends FlowNode {
    id: string;
    name: string;
    sourceId: string;
    weight: number;
    type: SimulationObjectType;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    /**
     * Actions to perform when an entity traverses this connector.
     * When populated, takes precedence over legacy operationSteps and stateModifications.
     */
    actions: Action[];
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
    /**
     * Entity template routing - optional field for ENTITY_TEMPLATE ConnectType
     */
    entityTemplateUniqueId?: string;
    /**
     * State condition routing - optional field for STATE_CONDITION ConnectType
     */
    stateCondition?: StateCondition;
    /**
     * @deprecated Use actions[] with AssignAction instead.
     * State modifications during routing.
     */
    stateModifications: StateModification[];
    /**
     * @deprecated Use destinationUniqueId instead.
     * ID of the target node.
     */
    targetId: string;
    static createDefault(id: string, sourceX?: number, sourceY?: number, targetX?: number, targetY?: number): Connector;
    description: string;
    constructor(id: string, name: string, sourceId: string, targetId: string, weight?: number, sourceX?: number, sourceY?: number, targetX?: number, targetY?: number, x?: number, y?: number);
    /**
     * Gets the effective destination unique ID.
     * If destinationUniqueId is set, returns that.
     * Otherwise, returns targetId for backward compatibility.
     */
    getEffectiveDestinationUniqueId(): string;
    /**
     * Update source location
     */
    setSourceLocation(x: number, y: number): void;
    /**
     * Update target location
     */
    setTargetLocation(x: number, y: number): void;
}
//# sourceMappingURL=Connector.d.ts.map