"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpgradeIssueSeverity = void 0;
/**
 * Represents the severity of an upgrade issue
 */
var UpgradeIssueSeverity;
(function (UpgradeIssueSeverity) {
    /** Issue prevents upgrade from proceeding */
    UpgradeIssueSeverity["Error"] = "Error";
    /** Issue should be noted but doesn't prevent upgrade */
    UpgradeIssueSeverity["Warning"] = "Warning";
})(UpgradeIssueSeverity = exports.UpgradeIssueSeverity || (exports.UpgradeIssueSeverity = {}));
