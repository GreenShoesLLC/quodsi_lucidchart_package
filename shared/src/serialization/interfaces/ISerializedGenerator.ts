import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ISerializedEntitySourceConfig } from './ISerializedEntitySourceConfig';

export interface ISerializedGenerator {
    id: string;
    name: string;
    description?: string;
    type: SimulationObjectType;
    x: number;
    y: number;

    // Required configuration
    generationConfig: ISerializedEntitySourceConfig;

    // Optional exit destination (activity ID)
    exitConnector?: string;
}
