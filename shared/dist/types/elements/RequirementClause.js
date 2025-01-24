"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementClause = void 0;
var RequirementMode_1 = require("./RequirementMode");
var ResourceRequest_1 = require("./ResourceRequest");
var RequirementClause = /** @class */ (function () {
    function RequirementClause(clauseId, mode, parentClauseId, requests, subClauses) {
        if (requests === void 0) { requests = []; }
        if (subClauses === void 0) { subClauses = []; }
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
    RequirementClause.prototype.addSubClause = function (clause) {
        this.subClauses.push(clause);
    };
    /**
     * Adds a ResourceRequest to this clause.
     * @param request - The ResourceRequest to add.
     */
    RequirementClause.prototype.addRequest = function (request) {
        this.requests.push(request);
    };
    /**
     * Validates the clause to ensure it has at least one request or sub-clause.
     * @throws Error if the clause is invalid.
     */
    RequirementClause.prototype.validate = function () {
        if (!this.requests.length && !this.subClauses.length) {
            throw new Error("RequirementClause ".concat(this.clauseId, " must have at least one request or sub-clause."));
        }
    };
    /**
     * Factory method to create a clause with a single ResourceRequest.
     */
    RequirementClause.createSingleRequestClause = function (clauseId, resourceId, quantity, mode, parentClauseId, priority, keepResource) {
        if (quantity === void 0) { quantity = 1; }
        if (mode === void 0) { mode = RequirementMode_1.RequirementMode.REQUIRE_ALL; }
        // Use the ResourceRequest class's factory method
        var resourceRequest = ResourceRequest_1.ResourceRequest.create(resourceId, {
            quantity: quantity,
            priority: priority,
            keepResource: keepResource,
        });
        // Return a new RequirementClause instance
        return new RequirementClause(clauseId, mode, parentClauseId, [resourceRequest] // Single request
        );
    };
    /**
     * Factory method to create a clause with multiple ResourceRequests.
     */
    RequirementClause.createMultiRequestClause = function (clauseId, requests, mode, parentClauseId) {
        if (mode === void 0) { mode = RequirementMode_1.RequirementMode.REQUIRE_ALL; }
        // Map input data to ResourceRequest instances
        var resourceRequests = requests.map(function (r) {
            return ResourceRequest_1.ResourceRequest.create(r.resourceId, {
                quantity: r.quantity,
                priority: r.priority,
                keepResource: r.keepResource,
            });
        });
        // Return a new RequirementClause instance
        return new RequirementClause(clauseId, mode, parentClauseId, resourceRequests // Multiple requests
        );
    };
    return RequirementClause;
}());
exports.RequirementClause = RequirementClause;
