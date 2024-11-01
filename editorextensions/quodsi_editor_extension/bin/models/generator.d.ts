import { SimulationObjectType } from "./enums/simulationObjectType";
import { Duration } from "./duration";
export declare class Generator {
    id: string;
    name: string;
    activityKeyId: string;
    entityType: string;
    periodicOccurrences: number;
    periodIntervalDuration: Duration;
    entitiesPerCreation: number;
    periodicStartDuration: Duration;
    maxEntities: number;
    type: SimulationObjectType;
    constructor(id: string, name: string, activityKeyId?: string, entityType?: string, periodicOccurrences?: number, periodIntervalDuration?: Duration, entitiesPerCreation?: number, periodicStartDuration?: Duration, maxEntities?: number);
}
