/**
 * Financial properties for simulation components.
 *
 * This module defines financial tracking configuration for activities and resources
 * as part of the Phase 1 costing implementation.
 */

/**
 * Financial configuration for activities.
 */
export class ActivityFinancialProperties {
    /**
     * Whether financial tracking is enabled for this activity
     */
    enabled: boolean = false;

    /**
     * One-time fixed cost applied at activity initialization
     */
    fixedCost: number = 0.0;

    /**
     * Variable cost applied for each entity processed
     */
    costPerEntityProcessed: number = 0.0;

    /**
     * Hourly cost accumulated during entity processing
     */
    costPerHourActive: number = 0.0;

    /**
     * Hourly cost accumulated during idle periods
     */
    costPerHourIdle: number = 0.0;

    /**
     * Multiplier applied to resource costs (e.g., for overtime)
     */
    resourceCostMultiplier: number = 1.0;

    constructor(options?: {
        enabled?: boolean;
        fixedCost?: number;
        costPerEntityProcessed?: number;
        costPerHourActive?: number;
        costPerHourIdle?: number;
        resourceCostMultiplier?: number;
    }) {
        if (options) {
            this.enabled = options.enabled ?? false;
            this.fixedCost = options.fixedCost ?? 0.0;
            this.costPerEntityProcessed = options.costPerEntityProcessed ?? 0.0;
            this.costPerHourActive = options.costPerHourActive ?? 0.0;
            this.costPerHourIdle = options.costPerHourIdle ?? 0.0;
            this.resourceCostMultiplier = options.resourceCostMultiplier ?? 1.0;
        }
    }

    /**
     * Validate that all financial properties have valid values.
     *
     * @throws Error if any financial property has an invalid value
     */
    validate(): void {
        if (this.fixedCost < 0) {
            throw new Error(`fixedCost must be non-negative, got ${this.fixedCost}`);
        }
        if (this.costPerEntityProcessed < 0) {
            throw new Error(`costPerEntityProcessed must be non-negative, got ${this.costPerEntityProcessed}`);
        }
        if (this.costPerHourActive < 0) {
            throw new Error(`costPerHourActive must be non-negative, got ${this.costPerHourActive}`);
        }
        if (this.costPerHourIdle < 0) {
            throw new Error(`costPerHourIdle must be non-negative, got ${this.costPerHourIdle}`);
        }
        if (this.resourceCostMultiplier < 0) {
            throw new Error(`resourceCostMultiplier must be non-negative, got ${this.resourceCostMultiplier}`);
        }
    }

    /**
     * Convert to plain object for JSON serialization.
     */
    toJSON(): any {
        return {
            enabled: this.enabled,
            fixedCost: this.fixedCost,
            costPerEntityProcessed: this.costPerEntityProcessed,
            costPerHourActive: this.costPerHourActive,
            costPerHourIdle: this.costPerHourIdle,
            resourceCostMultiplier: this.resourceCostMultiplier
        };
    }

    /**
     * Create from plain object (e.g., from JSON).
     */
    static fromJSON(data: any): ActivityFinancialProperties {
        return new ActivityFinancialProperties({
            enabled: data.enabled ?? false,
            fixedCost: data.fixedCost ?? 0.0,
            costPerEntityProcessed: data.costPerEntityProcessed ?? 0.0,
            costPerHourActive: data.costPerHourActive ?? 0.0,
            costPerHourIdle: data.costPerHourIdle ?? 0.0,
            resourceCostMultiplier: data.resourceCostMultiplier ?? 1.0
        });
    }
}

/**
 * Financial configuration for resources.
 */
export class ResourceFinancialProperties {
    /**
     * Whether financial tracking is enabled for this resource
     */
    enabled: boolean = false;

    /**
     * Fixed cost applied each time the resource is seized
     */
    costPerSeize: number = 0.0;

    /**
     * Hourly cost while resource is being used
     */
    costPerHourUtilized: number = 0.0;

    /**
     * Hourly cost while resource has available capacity
     */
    costPerHourIdle: number = 0.0;

    constructor(options?: {
        enabled?: boolean;
        costPerSeize?: number;
        costPerHourUtilized?: number;
        costPerHourIdle?: number;
    }) {
        if (options) {
            this.enabled = options.enabled ?? false;
            this.costPerSeize = options.costPerSeize ?? 0.0;
            this.costPerHourUtilized = options.costPerHourUtilized ?? 0.0;
            this.costPerHourIdle = options.costPerHourIdle ?? 0.0;
        }
    }

    /**
     * Validate that all financial properties have valid values.
     *
     * @throws Error if any financial property has an invalid value
     */
    validate(): void {
        if (this.costPerSeize < 0) {
            throw new Error(`costPerSeize must be non-negative, got ${this.costPerSeize}`);
        }
        if (this.costPerHourUtilized < 0) {
            throw new Error(`costPerHourUtilized must be non-negative, got ${this.costPerHourUtilized}`);
        }
        if (this.costPerHourIdle < 0) {
            throw new Error(`costPerHourIdle must be non-negative, got ${this.costPerHourIdle}`);
        }
    }

    /**
     * Convert to plain object for JSON serialization.
     */
    toJSON(): any {
        return {
            enabled: this.enabled,
            costPerSeize: this.costPerSeize,
            costPerHourUtilized: this.costPerHourUtilized,
            costPerHourIdle: this.costPerHourIdle
        };
    }

    /**
     * Create from plain object (e.g., from JSON).
     */
    static fromJSON(data: any): ResourceFinancialProperties {
        return new ResourceFinancialProperties({
            enabled: data.enabled ?? false,
            costPerSeize: data.costPerSeize ?? 0.0,
            costPerHourUtilized: data.costPerHourUtilized ?? 0.0,
            costPerHourIdle: data.costPerHourIdle ?? 0.0
        });
    }
}
