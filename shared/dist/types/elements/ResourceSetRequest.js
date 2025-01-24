"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBaseResourceRequirement = exports.createResourceRequirement = void 0;
var RequirementMode_1 = require("./RequirementMode");
var ResourceRequest_1 = require("./ResourceRequest");
// Factory function for ResourceRequirement
function createResourceRequirement(id, name, options) {
    var _a, _b, _c;
    if (options === void 0) { options = {}; }
    return {
        id: id,
        name: name,
        description: options.description,
        mode: (_a = options.mode) !== null && _a !== void 0 ? _a : RequirementMode_1.RequirementMode.REQUIRE_ALL,
        requests: (_b = options.requests) !== null && _b !== void 0 ? _b : [],
        isBaseResource: (_c = options.isBaseResource) !== null && _c !== void 0 ? _c : false
    };
}
exports.createResourceRequirement = createResourceRequirement;
// Helper function to create a base ResourceRequirement from a single Resource
function createBaseResourceRequirement(resource) {
    return createResourceRequirement("req_".concat(resource.id), // Convention for auto-generated IDs
    "".concat(resource.name, " Requirement"), {
        isBaseResource: true,
        requests: [
            (0, ResourceRequest_1.createResourceRequest)(resource.id) // Uses defaults
        ]
    });
}
exports.createBaseResourceRequirement = createBaseResourceRequirement;
