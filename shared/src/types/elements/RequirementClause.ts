import { RequirementMode } from "./RequirementMode";
import { ResourceRequest } from "./ResourceRequest";

export class RequirementClause {
    clauseId: string;
    mode: RequirementMode;
    parentClauseId?: string;
    requests: ResourceRequest[];
    subClauses: RequirementClause[];

    constructor(
        clauseId: string,
        mode: RequirementMode,
        parentClauseId?: string,
        requests: ResourceRequest[] = [],
        subClauses: RequirementClause[] = []
    ) {
        this.clauseId = clauseId;
        this.mode = mode;
        this.parentClauseId = parentClauseId;
        this.requests = requests;
        this.subClauses = subClauses;
    }

    /**
     * Adds a sub-clause to this clause.
     * @param clause - The sub-clause to add.
     */
    addSubClause(clause: RequirementClause): void {
        this.subClauses.push(clause);
    }

    /**
     * Adds a ResourceRequest to this clause.
     * @param request - The ResourceRequest to add.
     */
    addRequest(request: ResourceRequest): void {
        this.requests.push(request);
    }

    /**
     * Validates the clause to ensure it has at least one request or sub-clause.
     * @throws Error if the clause is invalid.
     */
    validate(): void {
        if (!this.requests.length && !this.subClauses.length) {
            throw new Error(
                `RequirementClause ${this.clauseId} must have at least one request or sub-clause.`
            );
        }
    }

    /**
     * Factory method to create a clause with a single ResourceRequest.
     */
    static createSingleRequestClause(
        clauseId: string,
        resourceId: string,
        quantity: number = 1,
        mode: RequirementMode = RequirementMode.REQUIRE_ALL,
        parentClauseId?: string,
        priority?: number,
        keepResource?: boolean
    ): RequirementClause {
        // Use the ResourceRequest class's factory method
        const resourceRequest = ResourceRequest.create(resourceId, {
            quantity,
            priority,
            keepResource,
        });

        // Return a new RequirementClause instance
        return new RequirementClause(
            clauseId,
            mode,
            parentClauseId,
            [resourceRequest] // Single request
        );
    }

    /**
     * Factory method to create a clause with multiple ResourceRequests.
     */
    static createMultiRequestClause(
        clauseId: string,
        requests: Array<
            Pick<ResourceRequest, "resourceId"> &
            Partial<Omit<ResourceRequest, "resourceId">>
        >,
        mode: RequirementMode = RequirementMode.REQUIRE_ALL,
        parentClauseId?: string
    ): RequirementClause {
        // Map input data to ResourceRequest instances
        const resourceRequests = requests.map((r) =>
            ResourceRequest.create(r.resourceId, {
                quantity: r.quantity,
                priority: r.priority,
                keepResource: r.keepResource,
            })
        );

        // Return a new RequirementClause instance
        return new RequirementClause(
            clauseId,
            mode,
            parentClauseId,
            resourceRequests // Multiple requests
        );
    }

}
