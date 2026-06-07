/**
 * Financial properties for simulation components.
 *
 * This module defines financial tracking configuration for activities and resources
 * as part of the Phase 1 costing implementation.
 */
/**
 * Financial configuration for activities.
 */
export declare class ActivityFinancialProperties {
    /**
     * Whether financial tracking is enabled for this activity
     */
    enabled: boolean;
    /**
     * One-time fixed cost applied at activity initialization
     */
    fixedCost: number;
    /**
     * Variable cost applied for each entity processed
     */
    costPerEntityProcessed: number;
    /**
     * Hourly cost accumulated during entity processing
     */
    costPerHourActive: number;
    /**
     * Hourly cost accumulated during idle periods
     */
    costPerHourIdle: number;
    /**
     * Multiplier applied to resource costs (e.g., for overtime)
     */
    resourceCostMultiplier: number;
    constructor(options?: {
        enabled?: boolean;
        fixedCost?: number;
        costPerEntityProcessed?: number;
        costPerHourActive?: number;
        costPerHourIdle?: number;
        resourceCostMultiplier?: number;
    });
    /**
     * Validate that all financial properties have valid values.
     *
     * @throws Error if any financial property has an invalid value
     */
    validate(): void;
    /**
     * Convert to plain object for JSON serialization.
     */
    toJSON(): any;
    /**
     * Create from plain object (e.g., from JSON).
     */
    static fromJSON(data: any): ActivityFinancialProperties;
}
/**
 * Financial configuration for resources.
 */
export declare class ResourceFinancialProperties {
    /**
     * Whether financial tracking is enabled for this resource
     */
    enabled: boolean;
    /**
     * Fixed cost applied each time the resource is seized
     */
    costPerSeize: number;
    /**
     * Hourly cost while resource is being used
     */
    costPerHourUtilized: number;
    /**
     * Hourly cost while resource has available capacity
     */
    costPerHourIdle: number;
    constructor(options?: {
        enabled?: boolean;
        costPerSeize?: number;
        costPerHourUtilized?: number;
        costPerHourIdle?: number;
    });
    /**
     * Validate that all financial properties have valid values.
     *
     * @throws Error if any financial property has an invalid value
     */
    validate(): void;
    /**
     * Convert to plain object for JSON serialization.
     */
    toJSON(): any;
    /**
     * Create from plain object (e.g., from JSON).
     */
    static fromJSON(data: any): ResourceFinancialProperties;
}
//# sourceMappingURL=FinancialProperties.d.ts.map