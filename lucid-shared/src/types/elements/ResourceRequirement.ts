import { RequirementClause } from "./RequirementClause";
import { RequirementMode } from "./RequirementMode";
import { Resource } from "./Resource";
import { SimulationObject } from "./SimulationObject";
import { SimulationObjectType } from "./SimulationObjectType";
import { ResourceRequest } from "./ResourceRequest";

export class ResourceRequirement implements SimulationObject {
    id: string;
    name: string;
    type: SimulationObjectType = SimulationObjectType.ResourceRequirement;
    rootClauses: RequirementClause[];

    constructor(
        id: string,
        name: string,
        rootClauses: RequirementClause[] = []
    ) {
        this.id = id;
        this.name = name;
        this.rootClauses = rootClauses;
    }

    /**
     * Validates the ResourceRequirement, ensuring it meets basic criteria.
     */
    validate(): boolean {
        if (!this.rootClauses.length) {
            throw new Error("ResourceRequirement must have at least one root clause.");
        }
        return true;
    }

    /**
     * Adds a new clause to the rootClauses array.
     *
     * @param clause - The clause to add.
     */
    addClause(clause: RequirementClause): void {
        this.rootClauses.push(clause);
    }

    /**
     * Removes a clause by its ID.
     *
     * @param clauseId - The ID of the clause to remove.
     */
    removeClause(clauseId: string): void {
        this.rootClauses = this.rootClauses.filter(
            (clause) => clause.clauseId !== clauseId
        );
    }

    /**
     * Converts the ResourceRequirement to a plain JSON object.
     */
    toJSON(): object {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            rootClauses: this.rootClauses,
        };
    }

    static createForSingleResource(
        resource: Resource,
        requestOpts: Partial<Omit<ResourceRequest, "resourceId">> = {},
        clauseId: string = "clause-1",
        mode: RequirementMode = RequirementMode.REQUIRE_ALL
    ): ResourceRequirement {
        // Generate an ID and name for the ResourceRequirement
        const id = `${resource.id}`;
        const name = `${resource.name}`;

        // Create a ResourceRequest instance
        const request = ResourceRequest.create(resource.id, requestOpts);

        // Create a RequirementClause instance
        const clause = new RequirementClause(
            clauseId,
            mode,
            undefined, // parentClauseId (optional)
            [request], // requests
            []         // subClauses
        );

        // Return a new ResourceRequirement instance
        return new ResourceRequirement(id, name, [clause]);
    }

}
