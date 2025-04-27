import { SimulationObjectType } from '../../types/elements/SimulationObjectType';

export interface ISerializedResource {
    id: string;
    name: string;
    type: SimulationObjectType;
    x: number;
    y: number;
    capacity: number;
}