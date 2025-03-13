// services/simulationDataService.ts - Refactored as a facade
import {
    initializeStorageService as initStorage,
    getStorageService as getStorage,
    setVerboseLogging as setVerbose,
    conditionalLog,
    conditionalInfo,
    conditionalError,
    conditionalWarn
} from './simulationData/storageService';

import { fetchCsvData as fetchCSV, getRequiredColumnsFromType as getColumns } from './simulationData/csvParser';
import { prepareCollectionUpdate as prepareUpdate } from './simulationData/collectionUpdater';

// Import collectors for re-export
import * as activityUtilizationCollector from './simulationData/collectors/activityUtilization';
import * as activityRepSummaryCollector from './simulationData/collectors/activityRepSummary';
import * as activityTimingCollector from './simulationData/collectors/activityTiming';
import * as entityStateRepSummaryCollector from './simulationData/collectors/entityStateRepSummary';
import * as entityThroughputRepSummaryCollector from './simulationData/collectors/entityThroughputRepSummary';
import * as resourceRepSummaryCollector from './simulationData/collectors/resourceRepSummary';
import * as resourceUtilizationCollector from './simulationData/collectors/resourceUtilization';

import { SerializedFields } from 'lucid-extension-sdk';


// Re-export storage service functions
export const initializeStorageService = initStorage;
export const getStorageService = getStorage;

// Re-export logging functions 
export { conditionalLog, conditionalInfo, conditionalError, conditionalWarn };

/**
 * Set whether verbose logging is enabled
 */
export function setVerboseLogging(verbose: boolean): void {
    setVerbose(verbose);
}

// Helper function to get required columns from a type
export function getRequiredColumnsFromType<T>(requiredProps: Array<keyof T> = []): string[] {
    return getColumns(requiredProps);
}

// Prepare collection updates - Generic function for any schema type
export function prepareCollectionUpdate<T>(
    data: T[],
    schema: any,
    idFieldOrFunction: string | ((item: T) => string) = 'Id'
): { schema: any; patch: { items: Map<string, SerializedFields> } } {
    return prepareUpdate(data, schema, idFieldOrFunction);
}

// Re-export fetch CSV data function
export async function fetchCsvData<T>(
    containerName: string,
    blobName: string,
    documentId: string,
    requiredColumns: string[] = []
): Promise<T[]> {
    return fetchCSV(containerName, blobName, documentId, requiredColumns);
}

// Re-export fetch functions with the original names
export const fetchActivityUtilization = activityUtilizationCollector.fetchData;
export const fetchActivityRepSummary = activityRepSummaryCollector.fetchData;
export const fetchActivityTiming = activityTimingCollector.fetchData;
export const fetchEntityStateRepSummary = entityStateRepSummaryCollector.fetchData;
export const fetchEntityThroughputRepSummary = entityThroughputRepSummaryCollector.fetchData;
export const fetchResourceRepSummary = resourceRepSummaryCollector.fetchData;
export const fetchResourceUtilization = resourceUtilizationCollector.fetchData;

// Re-export prepare functions with the original names
export const prepareActivityUtilizationUpdate = activityUtilizationCollector.prepareUpdate;
export const prepareActivityRepSummaryUpdate = activityRepSummaryCollector.prepareUpdate;
export const prepareActivityTimingUpdate = activityTimingCollector.prepareUpdate;
export const prepareEntityStateRepSummaryUpdate = entityStateRepSummaryCollector.prepareUpdate;
export const prepareEntityThroughputRepSummaryUpdate = entityThroughputRepSummaryCollector.prepareUpdate;
export const prepareResourceRepSummaryUpdate = resourceRepSummaryCollector.prepareUpdate;
export const prepareResourceUtilizationUpdate = resourceUtilizationCollector.prepareUpdate;
