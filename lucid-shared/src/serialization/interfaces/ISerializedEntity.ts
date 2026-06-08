import { SimulationObjectType } from '@quodsi/shared';

export interface ISerializedEntity {
    id: string;
    name: string;
    description?: string;
    type: SimulationObjectType;
    x: number;
    y: number;
}