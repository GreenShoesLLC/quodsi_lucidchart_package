import { RequirementMode } from '@quodsi/shared';
import { ISerializedResourceRequest } from './ISerializedResourceRequest';

/**
 * Wire-cleanup Phase B2 Task 9: ground-truthed against
 * `CleanRequirementClauseDoc` (engine `document/clean/elements.py`) —
 * `clauseId` renamed to `id`; `subClauses` renamed to `clauses`;
 * `parentClauseId` DROPPED entirely (round-trip-only bookkeeping — the clean
 * schema has no slot for it; tree structure comes entirely from nesting
 * under `clauses`). `requests`/`clauses` sparse-omitted when empty.
 */
export interface ISerializedRequirementClause {
    id: string;
    mode: RequirementMode;
    requests?: ISerializedResourceRequest[];
    clauses?: ISerializedRequirementClause[];
}
