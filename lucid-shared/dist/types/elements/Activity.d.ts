import { SimulationObjectType } from "./SimulationObjectType";
import { FlowNode } from "./FlowNode";
import { ActivityFinancialProperties } from "./FinancialProperties";
import { FailureProperties } from "./FailureProperties";
import { ConnectType } from "./ConnectType";
import { Action } from "./actions";
import { EntitySourceConfig } from "./EntitySourceConfig";
export declare class Activity extends FlowNode {
    id: string;
    name: string;
    capacity: number;
    inboundQueueCapacity: number;
    outboundQueueCapacity: number;
    type: SimulationObjectType;
    /**
     * Actions to perform when processing entities.
     * This is the new action-based system that replaces operationSteps.
     *
     * When actions is populated, it takes precedence over operationSteps
     * and pre/post processing state modifications.
     */
    actions: Action[];
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
    connectType: ConnectType;
    static createDefault(id: string, x?: number, y?: number): Activity;
    description: string;
    constructor(id: string, name: string, capacity?: number, inboundQueueCapacity?: number, outboundQueueCapacity?: number, actions?: Action[], x?: number, y?: number);
}
//# sourceMappingURL=Activity.d.ts.map