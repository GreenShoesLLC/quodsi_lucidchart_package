"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailureProperties = void 0;
var Duration_1 = require("./Duration");
var FailureClockMode_1 = require("./FailureClockMode");
/**
 * Failure (MTBF/MTTR) configuration for activities.
 * Mirrors Python quodsim/model_definition/failure_properties.py
 */
var FailureProperties = /** @class */ (function () {
    function FailureProperties(options) {
        var _a, _b, _c, _d, _e;
        this.enabled = false;
        this.mtbfDuration = null;
        this.mttrDuration = null;
        this.failureClockMode = FailureClockMode_1.FailureClockMode.WALL_CLOCK;
        this.repairResourceRequirementId = "";
        if (options) {
            this.enabled = (_a = options.enabled) !== null && _a !== void 0 ? _a : false;
            this.mtbfDuration = (_b = options.mtbfDuration) !== null && _b !== void 0 ? _b : null;
            this.mttrDuration = (_c = options.mttrDuration) !== null && _c !== void 0 ? _c : null;
            this.failureClockMode = (_d = options.failureClockMode) !== null && _d !== void 0 ? _d : FailureClockMode_1.FailureClockMode.WALL_CLOCK;
            this.repairResourceRequirementId = (_e = options.repairResourceRequirementId) !== null && _e !== void 0 ? _e : "";
        }
    }
    /**
     * Validate failure properties configuration.
     * When enabled, both MTBF and MTTR durations must be provided.
     */
    FailureProperties.prototype.validate = function () {
        if (this.enabled) {
            if (!this.mtbfDuration) {
                throw new Error("mtbfDuration is required when failure is enabled");
            }
            if (!this.mttrDuration) {
                throw new Error("mttrDuration is required when failure is enabled");
            }
        }
    };
    /**
     * Convert to plain object for JSON serialization.
     * Produces camelCase keys matching Python FailureProperties.from_dict() expectations.
     */
    FailureProperties.prototype.toJSON = function () {
        var result = {
            enabled: this.enabled,
            failureClockMode: this.failureClockMode,
            repairResourceRequirementId: this.repairResourceRequirementId
        };
        if (this.mtbfDuration) {
            result.mtbfDuration = {
                durationPeriodUnit: this.mtbfDuration.durationPeriodUnit,
                distribution: this.mtbfDuration.distribution
            };
        }
        else {
            result.mtbfDuration = null;
        }
        if (this.mttrDuration) {
            result.mttrDuration = {
                durationPeriodUnit: this.mttrDuration.durationPeriodUnit,
                distribution: this.mttrDuration.distribution
            };
        }
        else {
            result.mttrDuration = null;
        }
        return result;
    };
    /**
     * Create from plain object (e.g., from JSON or Lucid storage).
     */
    FailureProperties.fromJSON = function (data) {
        var _a, _b, _c;
        return new FailureProperties({
            enabled: (_a = data.enabled) !== null && _a !== void 0 ? _a : false,
            mtbfDuration: data.mtbfDuration
                ? new Duration_1.Duration(data.mtbfDuration.durationPeriodUnit, data.mtbfDuration.distribution)
                : null,
            mttrDuration: data.mttrDuration
                ? new Duration_1.Duration(data.mttrDuration.durationPeriodUnit, data.mttrDuration.distribution)
                : null,
            failureClockMode: (_b = data.failureClockMode) !== null && _b !== void 0 ? _b : FailureClockMode_1.FailureClockMode.WALL_CLOCK,
            repairResourceRequirementId: (_c = data.repairResourceRequirementId) !== null && _c !== void 0 ? _c : ""
        });
    };
    return FailureProperties;
}());
exports.FailureProperties = FailureProperties;
