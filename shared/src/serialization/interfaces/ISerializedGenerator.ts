import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ISerializedDuration } from './ISerializedDuration';

export interface ISerializedGenerator {
    id: string;
    name: string;
    type: SimulationObjectType;
    activityKeyId: string;
    entityId: string;
    periodicOccurrences: number;
    periodIntervalDuration: ISerializedDuration;
    entitiesPerCreation: number;
    periodicStartDuration: ISerializedDuration;
    maxEntities: number;
}
