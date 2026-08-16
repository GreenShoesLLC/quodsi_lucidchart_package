import { ISerializedRequirementClause } from './ISerializedRequirementClause';

/**
 * Wire-cleanup Phase B2 Task 9: ground-truthed against
 * `CleanResourceRequirementDoc` (engine `document/clean/elements.py`) — the
 * old `rootClauses: RequirementClause[]` array collapses to a single
 * required `rootClause` (Task 6: the "exactly one root clause" rule is now
 * structurally enforced, not a semantic validator check). No `type`
 * class-tag.
 */
export interface ISerializedResourceRequirement {
    id: string;
    name: string;
    rootClause: ISerializedRequirementClause;
}
