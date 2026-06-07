import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
export interface ISerializedResource {
    id: string;
    name: string;
    description?: string;
    type: SimulationObjectType;
    x: number;
    y: number;
    width?: number;
    height?: number;
    capacity: number;
    financialProperties?: any;
}
//# sourceMappingURL=ISerializedResource.d.ts.map