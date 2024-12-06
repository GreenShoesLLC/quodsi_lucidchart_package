import { ActivityRelationships, Connector, ModelDefinition } from "@quodsi/shared";

/**
 * Interface defining what's needed for model validation
 */
export interface ModelState {
    modelDefinition: ModelDefinition;
    connections: Map<string, Connector>;
    activityRelationships: Map<string, ActivityRelationships>;
}