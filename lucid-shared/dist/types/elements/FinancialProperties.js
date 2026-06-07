"use strict";
/**
 * Financial properties for simulation components.
 *
 * This module defines financial tracking configuration for activities and resources
 * as part of the Phase 1 costing implementation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceFinancialProperties = exports.ActivityFinancialProperties = void 0;
/**
 * Financial configuration for activities.
 */
var ActivityFinancialProperties = /** @class */ (function () {
    function ActivityFinancialProperties(options) {
        var _a, _b, _c, _d, _e, _f;
        /**
         * Whether financial tracking is enabled for this activity
         */
        this.enabled = false;
        /**
         * One-time fixed cost applied at activity initialization
         */
        this.fixedCost = 0.0;
        /**
         * Variable cost applied for each entity processed
         */
        this.costPerEntityProcessed = 0.0;
        /**
         * Hourly cost accumulated during entity processing
         */
        this.costPerHourActive = 0.0;
        /**
         * Hourly cost accumulated during idle periods
         */
        this.costPerHourIdle = 0.0;
        /**
         * Multiplier applied to resource costs (e.g., for overtime)
         */
        this.resourceCostMultiplier = 1.0;
        if (options) {
            this.enabled = (_a = options.enabled) !== null && _a !== void 0 ? _a : false;
            this.fixedCost = (_b = options.fixedCost) !== null && _b !== void 0 ? _b : 0.0;
            this.costPerEntityProcessed = (_c = options.costPerEntityProcessed) !== null && _c !== void 0 ? _c : 0.0;
            this.costPerHourActive = (_d = options.costPerHourActive) !== null && _d !== void 0 ? _d : 0.0;
            this.costPerHourIdle = (_e = options.costPerHourIdle) !== null && _e !== void 0 ? _e : 0.0;
            this.resourceCostMultiplier = (_f = options.resourceCostMultiplier) !== null && _f !== void 0 ? _f : 1.0;
        }
    }
    /**
     * Validate that all financial properties have valid values.
     *
     * @throws Error if any financial property has an invalid value
     */
    ActivityFinancialProperties.prototype.validate = function () {
        if (this.fixedCost < 0) {
            throw new Error("fixedCost must be non-negative, got ".concat(this.fixedCost));
        }
        if (this.costPerEntityProcessed < 0) {
            throw new Error("costPerEntityProcessed must be non-negative, got ".concat(this.costPerEntityProcessed));
        }
        if (this.costPerHourActive < 0) {
            throw new Error("costPerHourActive must be non-negative, got ".concat(this.costPerHourActive));
        }
        if (this.costPerHourIdle < 0) {
            throw new Error("costPerHourIdle must be non-negative, got ".concat(this.costPerHourIdle));
        }
        if (this.resourceCostMultiplier < 0) {
            throw new Error("resourceCostMultiplier must be non-negative, got ".concat(this.resourceCostMultiplier));
        }
    };
    /**
     * Convert to plain object for JSON serialization.
     */
    ActivityFinancialProperties.prototype.toJSON = function () {
        return {
            enabled: this.enabled,
            fixedCost: this.fixedCost,
            costPerEntityProcessed: this.costPerEntityProcessed,
            costPerHourActive: this.costPerHourActive,
            costPerHourIdle: this.costPerHourIdle,
            resourceCostMultiplier: this.resourceCostMultiplier
        };
    };
    /**
     * Create from plain object (e.g., from JSON).
     */
    ActivityFinancialProperties.fromJSON = function (data) {
        var _a, _b, _c, _d, _e, _f;
        return new ActivityFinancialProperties({
            enabled: (_a = data.enabled) !== null && _a !== void 0 ? _a : false,
            fixedCost: (_b = data.fixedCost) !== null && _b !== void 0 ? _b : 0.0,
            costPerEntityProcessed: (_c = data.costPerEntityProcessed) !== null && _c !== void 0 ? _c : 0.0,
            costPerHourActive: (_d = data.costPerHourActive) !== null && _d !== void 0 ? _d : 0.0,
            costPerHourIdle: (_e = data.costPerHourIdle) !== null && _e !== void 0 ? _e : 0.0,
            resourceCostMultiplier: (_f = data.resourceCostMultiplier) !== null && _f !== void 0 ? _f : 1.0
        });
    };
    return ActivityFinancialProperties;
}());
exports.ActivityFinancialProperties = ActivityFinancialProperties;
/**
 * Financial configuration for resources.
 */
var ResourceFinancialProperties = /** @class */ (function () {
    function ResourceFinancialProperties(options) {
        var _a, _b, _c, _d;
        /**
         * Whether financial tracking is enabled for this resource
         */
        this.enabled = false;
        /**
         * Fixed cost applied each time the resource is seized
         */
        this.costPerSeize = 0.0;
        /**
         * Hourly cost while resource is being used
         */
        this.costPerHourUtilized = 0.0;
        /**
         * Hourly cost while resource has available capacity
         */
        this.costPerHourIdle = 0.0;
        if (options) {
            this.enabled = (_a = options.enabled) !== null && _a !== void 0 ? _a : false;
            this.costPerSeize = (_b = options.costPerSeize) !== null && _b !== void 0 ? _b : 0.0;
            this.costPerHourUtilized = (_c = options.costPerHourUtilized) !== null && _c !== void 0 ? _c : 0.0;
            this.costPerHourIdle = (_d = options.costPerHourIdle) !== null && _d !== void 0 ? _d : 0.0;
        }
    }
    /**
     * Validate that all financial properties have valid values.
     *
     * @throws Error if any financial property has an invalid value
     */
    ResourceFinancialProperties.prototype.validate = function () {
        if (this.costPerSeize < 0) {
            throw new Error("costPerSeize must be non-negative, got ".concat(this.costPerSeize));
        }
        if (this.costPerHourUtilized < 0) {
            throw new Error("costPerHourUtilized must be non-negative, got ".concat(this.costPerHourUtilized));
        }
        if (this.costPerHourIdle < 0) {
            throw new Error("costPerHourIdle must be non-negative, got ".concat(this.costPerHourIdle));
        }
    };
    /**
     * Convert to plain object for JSON serialization.
     */
    ResourceFinancialProperties.prototype.toJSON = function () {
        return {
            enabled: this.enabled,
            costPerSeize: this.costPerSeize,
            costPerHourUtilized: this.costPerHourUtilized,
            costPerHourIdle: this.costPerHourIdle
        };
    };
    /**
     * Create from plain object (e.g., from JSON).
     */
    ResourceFinancialProperties.fromJSON = function (data) {
        var _a, _b, _c, _d;
        return new ResourceFinancialProperties({
            enabled: (_a = data.enabled) !== null && _a !== void 0 ? _a : false,
            costPerSeize: (_b = data.costPerSeize) !== null && _b !== void 0 ? _b : 0.0,
            costPerHourUtilized: (_c = data.costPerHourUtilized) !== null && _c !== void 0 ? _c : 0.0,
            costPerHourIdle: (_d = data.costPerHourIdle) !== null && _d !== void 0 ? _d : 0.0
        });
    };
    return ResourceFinancialProperties;
}());
exports.ResourceFinancialProperties = ResourceFinancialProperties;
