/**
 * Represents a request for a certain quantity of a particular resource.
 *
 * @property resourceId   - The ID of the resource being requested.
 * @property quantity     - How many units of the resource are needed.
 * @property priority     - Used for ordering or weighting resource allocation.
 * @property keepResource - If true, resource cannot be swapped out once assigned.
 */
export declare class ResourceRequest {
    resourceId: string;
    quantity: number;
    priority: number;
    keepResource: boolean;
    /**
     * Constructs a new ResourceRequest.
     *
     * @param resourceId   - The ID of the resource being requested.
     * @param quantity     - How many units of the resource are needed.
     * @param priority     - Priority for the request.
     * @param keepResource - Whether the resource should be locked after assignment.
     */
    constructor(resourceId: string, quantity?: number, priority?: number, keepResource?: boolean);
    /**
     * Factory method to create a ResourceRequest with default values.
     *
     * @param resourceId - Required string ID of the resource.
     * @param options    - Partial override for the ResourceRequest fields
     *                     (other than resourceId).
     * @returns A new ResourceRequest instance.
     */
    static create(resourceId: string, options?: Partial<Omit<ResourceRequest, "resourceId">>): ResourceRequest;
    /**
     * Validates the ResourceRequest, ensuring it meets expected criteria.
     * Throws an error if invalid.
     */
    validate(): void;
    /**
     * Converts the ResourceRequest to a plain JSON object.
     */
    toJSON(): object;
}
//# sourceMappingURL=ResourceRequest.d.ts.map