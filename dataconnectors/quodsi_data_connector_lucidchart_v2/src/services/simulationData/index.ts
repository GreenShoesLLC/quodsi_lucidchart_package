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
import * as activityUtilization from './collectors/activityUtilization';
import * as activityRepSummary from './collectors/activityRepSummary';
import * as activityTiming from './collectors/activityTiming';
import * as entityStateRepSummary from './collectors/entityStateRepSummary';
import * as entityThroughputRepSummary from './collectors/entityThroughputRepSummary';
import * as resourceRepSummary from './collectors/resourceRepSummary';
import * as resourceUtilization from './collectors/resourceUtilization';

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
    activityUtilization: activityUtilization.fetchData,
    activityRepSummary: activityRepSummary.fetchData,
    activityTiming: activityTiming.fetchData,
    entityStateRepSummary: entityStateRepSummary.fetchData,
    entityThroughputRepSummary: entityThroughputRepSummary.fetchData,
    resourceRepSummary: resourceRepSummary.fetchData,
    resourceUtilization: resourceUtilization.fetchData
};

// Export all prepare functions
export const prepare = {
    activityUtilization: activityUtilization.prepareUpdate,
    activityRepSummary: activityRepSummary.prepareUpdate,
    activityTiming: activityTiming.prepareUpdate,
    entityStateRepSummary: entityStateRepSummary.prepareUpdate,
    entityThroughputRepSummary: entityThroughputRepSummary.prepareUpdate,
    resourceRepSummary: resourceRepSummary.prepareUpdate,
    resourceUtilization: resourceUtilization.prepareUpdate
};
