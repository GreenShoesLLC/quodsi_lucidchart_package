// import { ActivityRelationships, Connector, ModelDefinition } from "@quodsi/shared";

import { ActivityRelationships } from "../../types/ActivityRelationships";
import { Connector } from '@quodsi/shared';
import { ModelDefinition } from '@quodsi/shared';


/**
 * Interface defining what's needed for model validation
 */
export interface ModelDefinitionState {
    modelDefinition: ModelDefinition;
    connections: Map<string, Connector>;
    activityRelationships: Map<string, ActivityRelationships>;
}