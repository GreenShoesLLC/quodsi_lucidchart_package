import { RequirementMode } from '@quodsi/shared';
import { ISerializedResourceRequest } from './ISerializedResourceRequest';

export interface ISerializedRequirementClause {
    clauseId: string;
    mode: RequirementMode;
    parentClauseId?: string;
    requests: ISerializedResourceRequest[];
    subClauses: ISerializedRequirementClause[];
}