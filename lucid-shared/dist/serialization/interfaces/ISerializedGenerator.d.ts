import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ISerializedEntitySourceConfig } from './ISerializedEntitySourceConfig';
export interface ISerializedGenerator {
    id: string;
    name: string;
    description?: string;
    type: SimulationObjectType;
    x: number;
    y: number;
    width?: number;
    height?: number;
    generationConfig: ISerializedEntitySourceConfig;
    exitConnector?: string;
}
//# sourceMappingURL=ISerializedGenerator.d.ts.map