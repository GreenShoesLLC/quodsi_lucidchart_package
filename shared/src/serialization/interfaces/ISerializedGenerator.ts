import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ISerializedConnector } from './ISerializedConnector';
import { ISerializedDuration } from './ISerializedDuration';

export interface ISerializedGenerator {
    id: string;
    name: string;
    type: SimulationObjectType;
    generator_type?: string; // 'FREQUENCY' (default) | 'TIME_DISTRIBUTED'
    activityKeyId: string;
    entityId: string;
    periodicOccurrences: number;
    periodIntervalDuration: ISerializedDuration;
    entitiesPerCreation: number;
    periodicStartDuration: ISerializedDuration;
    maxEntities: number;
    time_distributed_config_ids?: string[]; // For TIME_DISTRIBUTED generators
    connectors: ISerializedConnector[];
    x: number;
    y: number;
    initialStateModifications?: any[];
}
