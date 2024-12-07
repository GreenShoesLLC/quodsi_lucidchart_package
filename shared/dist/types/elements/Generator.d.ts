import { SimulationObjectType } from "./SimulationObjectType";
import { Duration } from "./Duration";
import { SimulationObject } from "./SimulationObject";
export declare class Generator implements SimulationObject {
    id: string;
    name: string;
    activityKeyId: string;
    entityId: string;
    periodicOccurrences: number;
    periodIntervalDuration: Duration;
    entitiesPerCreation: number;
    periodicStartDuration: Duration;
    maxEntities: number;
    type: SimulationObjectType;
    constructor(id: string, name: string, activityKeyId?: string, entityId?: string, // Changed from entityType
    periodicOccurrences?: number, periodIntervalDuration?: Duration, entitiesPerCreation?: number, periodicStartDuration?: Duration, maxEntities?: number);
}
//# sourceMappingURL=Generator.d.ts.map