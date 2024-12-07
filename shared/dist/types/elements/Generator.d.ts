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
    static createDefault(id: string): Generator;
    constructor(id: string, name: string, activityKeyId?: string, entityId?: string, periodicOccurrences?: number, periodIntervalDuration?: Duration, entitiesPerCreation?: number, periodicStartDuration?: Duration, maxEntities?: number);
}
//# sourceMappingURL=Generator.d.ts.map