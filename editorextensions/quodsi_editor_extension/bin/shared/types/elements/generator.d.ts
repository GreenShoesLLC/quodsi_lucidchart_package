import { SimulationObjectType } from "./enums/simulationObjectType";
import { Duration } from "./duration";
import { SimulationObject } from "./simulation_object";
export declare class Generator implements SimulationObject {
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
