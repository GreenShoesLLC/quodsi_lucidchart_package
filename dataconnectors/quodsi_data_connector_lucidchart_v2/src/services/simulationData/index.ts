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
import * as activityCrossRepSummary from './collectors/activityCrossRepCollector';
import * as activityRepSummary from './collectors/activityRepSummaryCollector';

import * as resourceCrossRepSummary from './collectors/resourceCrossRepCollector'
import * as resourceRepSummary from './collectors/resourceRepSummaryCollector';

import * as entityCrossRepCollector from './collectors/entityCrossRepCollector';
import * as entityRepCollector from './collectors/entityRepCollector';

// Export all collectors as a namespace
export const collectors = {
    activityCrossRepSummary,
    activityRepSummary,
    resourceCrossRepSummary,
    resourceRepSummary,
    entityCrossRepCollector,
    entityRepCollector,
};

// Export all fetch functions
export const fetch = {
    activityUtilization: activityCrossRepSummary.fetchActivityCrossRep,
    activityRepSummary: activityRepSummary.fetchActivityRepSummary,
    resourceCrossRepSummary: resourceCrossRepSummary.fetchResourceCrossRep,
    resourceRepSummary: resourceRepSummary.fetchResourceRepSummary,
    entityCrossRepCollector: entityCrossRepCollector.fetchEntityCrossRep,
    entityRepCollector: entityRepCollector.fetchEntityRep,
};

// Export all prepare functions
export const prepare = {
    activityUtilization: activityCrossRepSummary.prepareActivityCrossRepUpdate,
    activityRepSummary: activityRepSummary.prepareActivityRepSummaryUpdate,
    resourceCrossRepSummary: resourceCrossRepSummary.prepareResourceCrossRepUpdate,
    resourceRepSummary: resourceRepSummary.prepareResourceRepSummaryUpdate,
    entityCrossRepCollector: entityCrossRepCollector.prepareEntityCrossRepUpdate,
    entityRepCollector: entityRepCollector.prepareEntityRepUpdate,
};
