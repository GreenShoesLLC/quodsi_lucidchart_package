"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceRequirement = void 0;
var RequirementClause_1 = require("./RequirementClause");
var RequirementMode_1 = require("./RequirementMode");
var SimulationObjectType_1 = require("./SimulationObjectType");
var ResourceRequest_1 = require("./ResourceRequest");
var ResourceRequirement = /** @class */ (function () {
    function ResourceRequirement(id, name, rootClauses) {
        if (rootClauses === void 0) { rootClauses = []; }
        this.type = SimulationObjectType_1.SimulationObjectType.ResourceRequirement;
        this.id = id;
        this.name = name;
        this.rootClauses = rootClauses;
    }
    /**
     * Validates the ResourceRequirement, ensuring it meets basic criteria.
     */
    ResourceRequirement.prototype.validate = function () {
        if (!this.rootClauses.length) {
            throw new Error("ResourceRequirement must have at least one root clause.");
        }
        return true;
    };
    /**
     * Adds a new clause to the rootClauses array.
     *
     * @param clause - The clause to add.
     */
    ResourceRequirement.prototype.addClause = function (clause) {
        this.rootClauses.push(clause);
    };
    /**
     * Removes a clause by its ID.
     *
     * @param clauseId - The ID of the clause to remove.
     */
    ResourceRequirement.prototype.removeClause = function (clauseId) {
        this.rootClauses = this.rootClauses.filter(function (clause) { return clause.clauseId !== clauseId; });
    };
    /**
     * Converts the ResourceRequirement to a plain JSON object.
     */
    ResourceRequirement.prototype.toJSON = function () {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            rootClauses: this.rootClauses,
        };
    };
    ResourceRequirement.createForSingleResource = function (resource, requestOpts, clauseId, mode) {
        if (requestOpts === void 0) { requestOpts = {}; }
        if (clauseId === void 0) { clauseId = "clause-1"; }
        if (mode === void 0) { mode = RequirementMode_1.RequirementMode.REQUIRE_ALL; }
        // Generate an ID and name for the ResourceRequirement
        var id = "".concat(resource.id);
        var name = "".concat(resource.name);
        // Create a ResourceRequest instance
        var request = ResourceRequest_1.ResourceRequest.create(resource.id, requestOpts);
        // Create a RequirementClause instance
        var clause = new RequirementClause_1.RequirementClause(clauseId, mode, undefined, // parentClauseId (optional)
        [request], // requests
        [] // subClauses
        );
        // Return a new ResourceRequirement instance
        return new ResourceRequirement(id, name, [clause]);
    };
    return ResourceRequirement;
}());
exports.ResourceRequirement = ResourceRequirement;
