import { RequirementClause } from "./RequirementClause";
import { RequirementMode } from "./RequirementMode";
import { Resource } from "./Resource";
import { SimulationObject } from "./SimulationObject";
import { SimulationObjectType } from "./SimulationObjectType";
import { ResourceRequest } from "./ResourceRequest";
export declare class ResourceRequirement implements SimulationObject {
    id: string;
    name: string;
    type: SimulationObjectType;
    rootClauses: RequirementClause[];
    constructor(id: string, name: string, rootClauses?: RequirementClause[]);
    /**
     * Validates the ResourceRequirement, ensuring it meets basic criteria.
     */
    validate(): boolean;
    /**
     * Adds a new clause to the rootClauses array.
     *
     * @param clause - The clause to add.
     */
    addClause(clause: RequirementClause): void;
    /**
     * Removes a clause by its ID.
     *
     * @param clauseId - The ID of the clause to remove.
     */
    removeClause(clauseId: string): void;
    /**
     * Converts the ResourceRequirement to a plain JSON object.
     */
    toJSON(): object;
    static createForSingleResource(resource: Resource, requestOpts?: Partial<Omit<ResourceRequest, "resourceId">>, clauseId?: string, mode?: RequirementMode): ResourceRequirement;
}
//# sourceMappingURL=ResourceRequirement.d.ts.map