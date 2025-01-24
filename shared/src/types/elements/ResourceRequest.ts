/**
 * Represents a request for a certain quantity of a particular resource.
 *
 * @property resourceId   - The ID of the resource being requested.
 * @property quantity     - How many units of the resource are needed.
 * @property priority     - Used for ordering or weighting resource allocation.
 * @property keepResource - If true, resource cannot be swapped out once assigned.
 */
export class ResourceRequest {
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
    constructor(
        resourceId: string,
        quantity: number = 1,
        priority: number = 1,
        keepResource: boolean = false
    ) {
        this.resourceId = resourceId;
        this.quantity = quantity;
        this.priority = priority;
        this.keepResource = keepResource;
    }

    /**
     * Factory method to create a ResourceRequest with default values.
     *
     * @param resourceId - Required string ID of the resource.
     * @param options    - Partial override for the ResourceRequest fields
     *                     (other than resourceId).
     * @returns A new ResourceRequest instance.
     */
    static create(
        resourceId: string,
        options: Partial<Omit<ResourceRequest, "resourceId">> = {}
    ): ResourceRequest {
        return new ResourceRequest(
            resourceId,
            options.quantity ?? 1,
            options.priority ?? 1,
            options.keepResource ?? false
        );
    }

    /**
     * Validates the ResourceRequest, ensuring it meets expected criteria.
     * Throws an error if invalid.
     */
    validate(): void {
        if (this.quantity <= 0) {
            throw new Error("Quantity must be greater than 0.");
        }
        if (this.priority < 1) {
            throw new Error("Priority must be at least 1.");
        }
    }

    /**
     * Converts the ResourceRequest to a plain JSON object.
     */
    toJSON(): object {
        return {
            resourceId: this.resourceId,
            quantity: this.quantity,
            priority: this.priority,
            keepResource: this.keepResource,
        };
    }
}
