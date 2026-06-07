import { SimulationObjectType } from "./SimulationObjectType";
import { FlowNode } from "./FlowNode";
import { EntitySourceConfig } from "./EntitySourceConfig";
export declare class Generator extends FlowNode {
    id: string;
    name: string;
    type: SimulationObjectType;
    /**
     * Required configuration for entity generation.
     * Contains entityId, generatorType, timing parameters, and state modifications.
     */
    generationConfig: EntitySourceConfig;
    /**
     * Optional exit connector destination (activity ID).
     * Generators route all created entities to this single destination.
     */
    exitConnector?: string;
    static createDefault(id: string, x?: number, y?: number): Generator;
    description: string;
    constructor(id: string, name: string, generationConfig: EntitySourceConfig, exitConnector?: string, x?: number, y?: number);
}
//# sourceMappingURL=Generator.d.ts.map