import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ISerializedConnector } from './ISerializedConnector';
import { ISerializedDuration } from './ISerializedDuration';

export interface ISerializedGenerator {
    id: string;
    name: string;
    type: SimulationObjectType;
    generatorType?: string; // 'FREQUENCY' (default) | 'TIME_DISTRIBUTED'
    activityKeyId: string;
    entityId: string;
    periodicOccurrences: number;
    periodIntervalDuration: ISerializedDuration;
    entitiesPerCreation: number;
    periodicStartDuration: ISerializedDuration;
    maxEntities: number;
    timeDistributedConfigIds?: string[]; // For TIME_DISTRIBUTED generators
    connectors: ISerializedConnector[];
    x: number;
    y: number;
    initialStateModifications?: any[];
}
