import { RequirementMode } from '../../types/elements/RequirementMode';
import { SimulationObjectType } from '../../types/elements/SimulationObjectType';

export interface ISerializedResourceRequest {
    resourceId: string;
    quantity: number;
    priority: number;
    keepResource: boolean;
}

export interface ISerializedRequirementClause {
    clauseId: string;
    mode: RequirementMode;
    parentClauseId?: string;
    requests: ISerializedResourceRequest[];
    subClauses: ISerializedRequirementClause[];
}

export interface ISerializedResourceRequirement {
    id: string;
    name: string;
    type: SimulationObjectType;
    rootClauses: ISerializedRequirementClause[];
}
