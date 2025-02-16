import { RequirementMode } from '../../types/elements/RequirementMode';
import { ISerializedResourceRequest } from './ISerializedResourceRequest';

export interface ISerializedRequirementClause {
    clauseId: string;
    mode: RequirementMode;
    parentClauseId?: string;
    requests: ISerializedResourceRequest[];
    subClauses: ISerializedRequirementClause[];
}