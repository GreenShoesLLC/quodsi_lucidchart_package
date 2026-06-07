import { RequirementMode } from "./RequirementMode";
import { ResourceRequest } from "./ResourceRequest";
export declare class RequirementClause {
    clauseId: string;
    mode: RequirementMode;
    parentClauseId?: string;
    requests: ResourceRequest[];
    subClauses: RequirementClause[];
    constructor(clauseId: string, mode: RequirementMode, parentClauseId?: string, requests?: ResourceRequest[], subClauses?: RequirementClause[]);
    /**
     * Adds a sub-clause to this clause.
     * @param clause - The sub-clause to add.
     */
    addSubClause(clause: RequirementClause): void;
    /**
     * Adds a ResourceRequest to this clause.
     * @param request - The ResourceRequest to add.
     */
    addRequest(request: ResourceRequest): void;
    /**
     * Validates the clause to ensure it has at least one request or sub-clause.
     * @throws Error if the clause is invalid.
     */
    validate(): void;
    /**
     * Factory method to create a clause with a single ResourceRequest.
     */
    static createSingleRequestClause(clauseId: string, resourceId: string, quantity?: number, mode?: RequirementMode, parentClauseId?: string, priority?: number, keepResource?: boolean): RequirementClause;
    /**
     * Factory method to create a clause with multiple ResourceRequests.
     */
    static createMultiRequestClause(clauseId: string, requests: Array<Pick<ResourceRequest, "resourceId"> & Partial<Omit<ResourceRequest, "resourceId">>>, mode?: RequirementMode, parentClauseId?: string): RequirementClause;
}
//# sourceMappingURL=RequirementClause.d.ts.map