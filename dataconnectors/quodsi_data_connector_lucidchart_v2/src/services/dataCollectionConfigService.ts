// src/services/dataCollectionConfigService.ts
import { conditionalLog } from '../utils/loggingUtils';

// Configuration for enabling/disabling specific data collections
export interface DataCollectionConfig {
    activityUtilization: boolean;
    activityRepSummary: boolean;
    activityTiming: boolean;
    entityStateRepSummary: boolean;
    entityThroughputRepSummary: boolean;
    resourceRepSummary: boolean;
    completeActivityMetrics: boolean;
    customMetrics: boolean;
}

// Default configuration - all collections enabled
const defaultDataCollectionConfig: DataCollectionConfig = {
    activityUtilization: false,
    activityRepSummary: false,
    activityTiming: false,
    entityStateRepSummary: true,
    entityThroughputRepSummary: false,
    resourceRepSummary: false,
    completeActivityMetrics: false,
    customMetrics: false
};

// Current active configuration - starts with defaults
let activeDataCollectionConfig: DataCollectionConfig = { ...defaultDataCollectionConfig };

/**
 * Set which data collections should be enabled/disabled
 * @param config Configuration specifying which collections to enable/disable
 */
export function setDataCollectionConfig(config: Partial<DataCollectionConfig>): void {
    // Only update the properties that are provided in the partial config
    activeDataCollectionConfig = {
        ...activeDataCollectionConfig,
        ...config
    };

    conditionalLog("Data collection configuration updated:", true, activeDataCollectionConfig);
}

/**
 * Reset data collection configuration to default (all enabled)
 */
export function resetDataCollectionConfig(): void {
    activeDataCollectionConfig = { ...defaultDataCollectionConfig };
    conditionalLog("Data collection configuration reset to defaults:", true, activeDataCollectionConfig);
}

/**
 * Get current data collection configuration
 */
export function getDataCollectionConfig(): DataCollectionConfig {
    return { ...activeDataCollectionConfig };
}

/**
 * Check if a specific data collection is enabled
 * @param collectionName Name of the collection to check
 */
export function isDataCollectionEnabled(collectionName: keyof DataCollectionConfig): boolean {
    return activeDataCollectionConfig[collectionName];
}
