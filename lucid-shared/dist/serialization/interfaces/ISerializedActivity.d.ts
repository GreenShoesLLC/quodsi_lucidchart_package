import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ISerializedConnector } from './ISerializedConnector';
import { ConnectType } from '../../types/elements/ConnectType';
import { ISerializedAction } from './ISerializedAction';
import { ISerializedEntitySourceConfig } from './ISerializedEntitySourceConfig';
export interface ISerializedActivity {
    id: string;
    name: string;
    description?: string;
    type: SimulationObjectType;
    x: number;
    y: number;
    width?: number;
    height?: number;
    capacity: number;
    inboundQueueCapacity: number;
    outboundQueueCapacity: number;
    actions: ISerializedAction[];
    sourceConfig?: ISerializedEntitySourceConfig;
    connectors: ISerializedConnector[];
    financialProperties?: any;
    failureProperties?: any;
    connectType?: ConnectType;
}
//# sourceMappingURL=ISerializedActivity.d.ts.map