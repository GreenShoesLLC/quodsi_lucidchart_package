import { ActivityRelationships, Connector, ModelDefinition } from "@quodsi/shared";
/**
 * Interface defining what's needed for model validation
 */
export interface ModelDefinitionState {
    modelDefinition: ModelDefinition;
    connections: Map<string, Connector>;
    activityRelationships: Map<string, ActivityRelationships>;
}
//# sourceMappingURL=ModelDefinitionState.d.ts.map