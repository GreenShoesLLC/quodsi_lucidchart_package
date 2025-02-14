import { SimulationObjectType } from '../../types/elements/SimulationObjectType';

export interface ISerializedEntity {
    id: string;
    name: string;
    type: SimulationObjectType;
}
