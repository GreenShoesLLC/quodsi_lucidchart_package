"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementMode = void 0;
/**
 * Enumerates the modes in which resource requests can be required:
 * - REQUIRE_ALL: All child items must be satisfied.
 * - REQUIRE_ANY: At least one of the child items must be satisfied.
 */
var RequirementMode;
(function (RequirementMode) {
    RequirementMode["REQUIRE_ALL"] = "REQUIRE_ALL";
    RequirementMode["REQUIRE_ANY"] = "REQUIRE_ANY";
})(RequirementMode = exports.RequirementMode || (exports.RequirementMode = {}));
