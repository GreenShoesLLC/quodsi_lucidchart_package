import { ActivityRelationships } from "../../../shared/types/ActivityRelationships";
import { Connection } from "../../../shared/types/Connection";
import { SimulationElement } from "../../../shared/types/SimulationElement";


/**
 * Interface defining what's needed for model validation
 */
export interface ModelState {
    elements: Map<string, SimulationElement>;
    connections: Map<string, Connection>;
    activityRelationships: Map<string, ActivityRelationships>;
    relationships: {
        activities: Set<string>;
        entities: Set<string>;
        generators: Set<string>;
        connectors: Set<string>;
        resources: Set<string>;
    };
}
