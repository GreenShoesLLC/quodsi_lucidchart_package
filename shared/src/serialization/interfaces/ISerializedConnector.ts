import { SimulationObjectType } from '../../types/elements/SimulationObjectType';

export interface ISerializedConnector {
    id: string;
    sourceId: string;
    targetId: string;
    type: SimulationObjectType;
}
