import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ISerializedAction } from './ISerializedAction';
export interface ISerializedConnector {
    id: string;
    name: string;
    description?: string;
    type: SimulationObjectType;
    sourceId: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    x: number;
    y: number;
    weight: number;
    actions: ISerializedAction[];
    destinationUniqueId?: string;
    destinationPriority?: number;
    targetId: string;
    entityTemplateUniqueId?: string;
    stateCondition?: any;
    stateModifications?: any[];
}
//# sourceMappingURL=ISerializedConnector.d.ts.map