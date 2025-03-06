/**
 * Simulation Data Types
 * 
 * This file re-exports all simulation data interfaces from the interfaces directory.
 * It maintains backward compatibility with existing code while providing better
 * organization through separate interface files.
 */

export {
    ActivityUtilizationData,
    ActivityRepSummaryData,
    ActivityTimingData,
    EntityStateRepSummaryData,
    EntityThroughputRepSummaryData,
    ResourceRepSummaryData,
    CompleteActivityMetricsData,
    CustomMetricsData
} from './interfaces';
