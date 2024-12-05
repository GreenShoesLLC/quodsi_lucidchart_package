import { ActivityRelationships } from "../../shared/types/ActivityRelationships";
import { Connector } from "../../shared/types/elements/Connector";
import { ModelDefinition } from "../../shared/types/elements/ModelDefinition";

/**
 * Interface defining what's needed for model validation
 */
export interface ModelState {
    modelDefinition: ModelDefinition;
    connections: Map<string, Connector>;
    activityRelationships: Map<string, ActivityRelationships>;
}
