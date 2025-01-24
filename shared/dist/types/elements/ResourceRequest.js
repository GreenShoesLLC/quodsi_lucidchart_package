"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceRequest = void 0;
/**
 * Represents a request for a certain quantity of a particular resource.
 *
 * @property resourceId   - The ID of the resource being requested.
 * @property quantity     - How many units of the resource are needed.
 * @property priority     - Used for ordering or weighting resource allocation.
 * @property keepResource - If true, resource cannot be swapped out once assigned.
 */
var ResourceRequest = /** @class */ (function () {
    /**
     * Constructs a new ResourceRequest.
     *
     * @param resourceId   - The ID of the resource being requested.
     * @param quantity     - How many units of the resource are needed.
     * @param priority     - Priority for the request.
     * @param keepResource - Whether the resource should be locked after assignment.
     */
    function ResourceRequest(resourceId, quantity, priority, keepResource) {
        if (quantity === void 0) { quantity = 1; }
        if (priority === void 0) { priority = 1; }
        if (keepResource === void 0) { keepResource = false; }
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
    ResourceRequest.create = function (resourceId, options) {
        var _a, _b, _c;
        if (options === void 0) { options = {}; }
        return new ResourceRequest(resourceId, (_a = options.quantity) !== null && _a !== void 0 ? _a : 1, (_b = options.priority) !== null && _b !== void 0 ? _b : 1, (_c = options.keepResource) !== null && _c !== void 0 ? _c : false);
    };
    /**
     * Validates the ResourceRequest, ensuring it meets expected criteria.
     * Throws an error if invalid.
     */
    ResourceRequest.prototype.validate = function () {
        if (this.quantity <= 0) {
            throw new Error("Quantity must be greater than 0.");
        }
        if (this.priority < 1) {
            throw new Error("Priority must be at least 1.");
        }
    };
    /**
     * Converts the ResourceRequest to a plain JSON object.
     */
    ResourceRequest.prototype.toJSON = function () {
        return {
            resourceId: this.resourceId,
            quantity: this.quantity,
            priority: this.priority,
            keepResource: this.keepResource,
        };
    };
    return ResourceRequest;
}());
exports.ResourceRequest = ResourceRequest;
