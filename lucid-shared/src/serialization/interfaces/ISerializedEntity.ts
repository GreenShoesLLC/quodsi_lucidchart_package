import { SimulationObjectType } from '../../types/elements/SimulationObjectType';

export interface ISerializedEntity {
    id: string;
    name: string;
    description?: string;
    type: SimulationObjectType;
    x: number;
    y: number;
}