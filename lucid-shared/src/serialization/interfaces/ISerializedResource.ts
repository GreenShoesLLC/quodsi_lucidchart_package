import { SimulationObjectType } from '@quodsi/shared';

export interface ISerializedResource {
    id: string;
    name: string;
    description?: string;
    type: SimulationObjectType;
    x: number;
    y: number;
    width?: number;   // Path X-lite: SVG userSpace shape size; absent for legacy models
    height?: number;
    capacity: number;
    financialProperties?: any;
}