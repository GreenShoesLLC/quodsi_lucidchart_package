// services/simulationData/index.ts

// Re-export storage service functions
export {
    initializeStorageService,
    getStorageService,
    setVerboseLogging,
    conditionalLog,
    conditionalInfo,
    conditionalError,
    conditionalWarn
} from './storageService';

// Re-export CSV parser functions
export {
    fetchCsvData,
    getRequiredColumnsFromType
} from './csvParser';

// Re-export collection updater functions
export {
    prepareCollectionUpdate
} from './collectionUpdater';

// Import all collectors
import * as activityUtilization from './collectors/activityUtilizationCollector';
import * as activityRepSummary from './collectors/activityRepSummaryCollector';
import * as activityTiming from './collectors/activityTimingCollector';
import * as entityStateRepSummary from './collectors/entityStateRepSummaryCollector';
import * as entityThroughputRepSummary from './collectors/entityThroughputRepSummaryCollector';
import * as resourceRepSummary from './collectors/resourceRepSummaryCollector';
import * as resourceUtilization from './collectors/resourceUtilizationCollector';

// Export all collectors as a namespace
export const collectors = {
    activityUtilization,
    activityRepSummary,
    activityTiming,
    entityStateRepSummary,
    entityThroughputRepSummary,
    resourceRepSummary,
    resourceUtilization
};

// Export all fetch functions
export const fetch = {
    activityUtilization: activityUtilization.fetchActivityUtilization,
    activityRepSummary: activityRepSummary.fetchActivityRepSummary,
    activityTiming: activityTiming.fetchActivityTiming,
    entityStateRepSummary: entityStateRepSummary.fetchEntityStateRepSummary,
    entityThroughputRepSummary: entityThroughputRepSummary.fetchEntityThroughputRepSummary,
    resourceRepSummary: resourceRepSummary.fetchResourceRepSummary,
    resourceUtilization: resourceUtilization.fetchResourceUtilization
};

// Export all prepare functions
export const prepare = {
    activityUtilization: activityUtilization.prepareActivityUtilizationUpdate,
    activityRepSummary: activityRepSummary.prepareActivityRepSummaryUpdate,
    activityTiming: activityTiming.prepareActivityTimingUpdate,
    entityStateRepSummary: entityStateRepSummary.prepareEntityStateRepSummaryUpdate,
    entityThroughputRepSummary: entityThroughputRepSummary.prepareEntityThroughputRepSummaryUpdate,
    resourceRepSummary: resourceRepSummary.prepareResourceRepSummaryUpdate,
    resourceUtilization: resourceUtilization.prepareResourceUtilizationUpdate
};
