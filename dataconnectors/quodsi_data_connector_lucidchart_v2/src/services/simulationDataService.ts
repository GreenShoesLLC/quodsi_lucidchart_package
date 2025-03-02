// services/simulationDataService.ts
import { parse } from 'papaparse';
import { AzureStorageService } from './azureStorageService';
import { SerializedFields } from 'lucid-extension-sdk';
import { 
    ActivityUtilizationSchema,
    ActivityRepSummarySchema,
    ActivityTimingSchema,
    EntityStateRepSummarySchema,
    EntityThroughputRepSummarySchema,
    ResourceRepSummarySchema,
    CompleteActivityMetricsSchema,
    CustomMetricsSchema
} from '../collections';
import { 
    ActivityUtilizationData,
    ActivityRepSummaryData,
    ActivityTimingData,
    EntityStateRepSummaryData,
    EntityThroughputRepSummaryData,
    ResourceRepSummaryData,
    CompleteActivityMetricsData,
    CustomMetricsData
} from '../collections/types/simulationTypes';

// Create a single instance of the storage service
let storageService: AzureStorageService | null = null;
let isVerboseLogging = true;

/**
 * Set whether verbose logging is enabled
 */
export function setVerboseLogging(verbose: boolean): void {
    isVerboseLogging = verbose;
}

/**
 * Conditionally logs based on verbosity setting
 */
function conditionalLog(message: string, ...args: any[]): void {
    if (isVerboseLogging) {
        console.log(message, ...args);
    }
}

/**
 * Conditionally logs information based on verbosity setting
 */
function conditionalInfo(message: string, ...args: any[]): void {
    if (isVerboseLogging) {
        console.info(message, ...args);
    }
}

/**
 * Error logs are always displayed regardless of verbosity setting
 */
function conditionalError(message: string, ...args: any[]): void {
    console.error(message, ...args);
}

/**
 * Warning logs are always displayed regardless of verbosity setting
 */
function conditionalWarn(message: string, ...args: any[]): void {
    console.warn(message, ...args);
}

export function initializeStorageService(connectionString: string): AzureStorageService {
    if (!storageService) {
        storageService = new AzureStorageService(connectionString);
    }
    return storageService;
}

export function getStorageService(): AzureStorageService {
    if (!storageService) {
        throw new Error('Storage service not initialized. Call initializeStorageService first.');
    }
    return storageService;
}

// Helper function to get required columns from a type
function getRequiredColumnsFromType<T>(requiredProps: Array<keyof T> = []): string[] {
    return requiredProps.map(prop => String(prop));
}

// Generic function to fetch and parse CSV data from Azure Blob Storage
export async function fetchCsvData<T>(
    containerName: string,
    blobName: string,
    documentId: string,
    requiredColumns: string[] = []
): Promise<T[]> {
    try {
        conditionalLog(`Fetching ${blobName} data for document ${documentId}...`);
        
        // Get storage service
        const storage = getStorageService();
        
        // Construct the full blob path including the document ID
        const fullBlobPath = `${documentId}/${blobName}`;
        
        // Fetch CSV content from Azure Blob Storage
        const csvText = await storage.getBlobContent(containerName, fullBlobPath);
        
        if (!csvText) {
            conditionalWarn(`CSV data not found for ${fullBlobPath}`);
            return [];
        }
        
        // Parse CSV to JSON
        const parsedData = await new Promise<import('papaparse').ParseResult<any>>((resolve) => {
            parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results)
            });
        });
        
        // Validate that all required columns are present
        if (requiredColumns.length > 0) {
            const availableColumns = parsedData.meta.fields || [];
            const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col));
            
            if (missingColumns.length > 0) {
                conditionalError(`CSV ${blobName} is missing required columns: ${missingColumns.join(', ')}`);
                conditionalError(`Available columns: ${availableColumns.join(', ')}`);
                throw new Error(`CSV ${blobName} is missing required columns: ${missingColumns.join(', ')}`);
            }
            
            // Log any extra columns as information
            const extraColumns = availableColumns.filter(col => !requiredColumns.includes(col));
            if (extraColumns.length > 0) {
                conditionalInfo(`CSV ${blobName} contains extra columns not in interface: ${extraColumns.join(', ')}`);
            }
        }
        
        conditionalLog(`Successfully parsed ${parsedData.data.length} rows from ${blobName}`);
        
        return parsedData.data as T[];
    } catch (error) {
        conditionalError(`Error fetching ${blobName} data:`, error);
        throw error;
    }
}

// Prepare collection updates - Generic function for any schema type
export function prepareCollectionUpdate<T>(
    data: T[],
    schema: any,
    idFieldOrFunction: string | ((item: T) => string) = 'Id'
): { schema: any; patch: { items: Map<string, SerializedFields> } } {
    const items = new Map<string, SerializedFields>();

    data.forEach(item => {
        let id: string;
        
        // Handle both string id field and function that generates an id
        if (typeof idFieldOrFunction === 'function') {
            id = idFieldOrFunction(item);
        } else {
            id = (item as any)[idFieldOrFunction];
        }
        
        if (!id) {
            conditionalWarn(`Item missing ID:`, item);
            return;
        }

        const quotedId = `"${id}"`;
        
        // Convert to serialized fields
        const serialized: SerializedFields = {};
        Object.entries(item as object).forEach(([key, value]) => {
            serialized[key] = value;
        });

        items.set(quotedId, serialized);
    });

    return {
        schema,
        patch: {
            items
        }
    };
}

// Required columns for each CSV type
const activityUtilizationRequiredColumns = getRequiredColumnsFromType<ActivityUtilizationData>([
    'Id', 'Name', 'utilization_mean', 'utilization_max', 'utilization_std_dev',
    'capacity_mean', 'capacity_max', 'capacity_std_dev',
    'contents_mean', 'contents_max', 'contents_std_dev',
    'queue_length_mean', 'queue_length_max', 'queue_length_std_dev'
]);

const activityRepSummaryRequiredColumns = getRequiredColumnsFromType<ActivityRepSummaryData>([
    'rep', 'activity_id', 'capacity', 'total_available_clock', 'total_arrivals',
    'total_requests', 'total_captures', 'total_releases', 'total_time_in_capture',
    'utilization_percentage', 'throughput_rate'
]);

const activityTimingRequiredColumns = getRequiredColumnsFromType<ActivityTimingData>([
    'Id', 'Name', 'cycle_time_mean', 'cycle_time_median', 'cycle_time_std_dev',
    'service_time_mean', 'waiting_time_mean', 'blocked_time_mean'
]);

const entityStateRepSummaryRequiredColumns = getRequiredColumnsFromType<EntityStateRepSummaryData>([
    'rep', 'entity_type', 'count', 'avg_time_in_system', 'avg_time_waiting',
    'percent_waiting', 'percent_operation'
]);

const entityThroughputRepSummaryRequiredColumns = getRequiredColumnsFromType<EntityThroughputRepSummaryData>([
    'rep', 'entity_type', 'count', 'completed_count', 'in_progress_count',
    'throughput_rate'
]);

const resourceRepSummaryRequiredColumns = getRequiredColumnsFromType<ResourceRepSummaryData>([
    'rep', 'resource_id', 'total_requests', 'total_captures', 'total_releases'
]);

const customMetricsRequiredColumns = getRequiredColumnsFromType<CustomMetricsData>([
    'Id', 'Name', 'utilization_mean', 'throughput_mean', 'bottleneck_frequency'
]);

// For CompleteActivityMetrics, we'll just require the ID and Name columns as a minimum
// since it has a very large number of columns
const completeActivityMetricsRequiredColumns = getRequiredColumnsFromType<CompleteActivityMetricsData>([
    'Id', 'Name'
]);

// Type-specific fetch functions for different CSV types
export async function fetchActivityUtilization(
    containerName: string,
    documentId: string
): Promise<ActivityUtilizationData[]> {
    return fetchCsvData<ActivityUtilizationData>(
        containerName, 
        'activity_utilization.csv', 
        documentId,
        activityUtilizationRequiredColumns
    );
}

export async function fetchActivityRepSummary(
    containerName: string,
    documentId: string
): Promise<ActivityRepSummaryData[]> {
    return fetchCsvData<ActivityRepSummaryData>(
        containerName, 
        'activity_rep_summary.csv', 
        documentId,
        activityRepSummaryRequiredColumns
    );
}

export async function fetchActivityTiming(
    containerName: string,
    documentId: string
): Promise<ActivityTimingData[]> {
    return fetchCsvData<ActivityTimingData>(
        containerName, 
        'activity_timing.csv', 
        documentId,
        activityTimingRequiredColumns
    );
}

export async function fetchEntityStateRepSummary(
    containerName: string,
    documentId: string
): Promise<EntityStateRepSummaryData[]> {
    return fetchCsvData<EntityStateRepSummaryData>(
        containerName, 
        'entity_state_rep_summary.csv', 
        documentId,
        entityStateRepSummaryRequiredColumns
    );
}

export async function fetchEntityThroughputRepSummary(
    containerName: string,
    documentId: string
): Promise<EntityThroughputRepSummaryData[]> {
    return fetchCsvData<EntityThroughputRepSummaryData>(
        containerName, 
        'entity_throughput_rep_summary.csv', 
        documentId,
        entityThroughputRepSummaryRequiredColumns
    );
}

export async function fetchResourceRepSummary(
    containerName: string,
    documentId: string
): Promise<ResourceRepSummaryData[]> {
    return fetchCsvData<ResourceRepSummaryData>(
        containerName, 
        'resource_rep_summary.csv', 
        documentId,
        resourceRepSummaryRequiredColumns
    );
}

export async function fetchCompleteActivityMetrics(
    containerName: string,
    documentId: string
): Promise<CompleteActivityMetricsData[]> {
    return fetchCsvData<CompleteActivityMetricsData>(
        containerName, 
        'complete_activity_metrics.csv', 
        documentId,
        completeActivityMetricsRequiredColumns
    );
}

export async function fetchCustomMetrics(
    containerName: string,
    documentId: string
): Promise<CustomMetricsData[]> {
    return fetchCsvData<CustomMetricsData>(
        containerName, 
        'custom_metrics.csv', 
        documentId,
        customMetricsRequiredColumns
    );
}

// Collection preparation functions for different schemas

export function prepareActivityUtilizationUpdate(data: ActivityUtilizationData[]) {
    return prepareCollectionUpdate(data, ActivityUtilizationSchema, 'Id');
}

export function prepareActivityRepSummaryUpdate(data: ActivityRepSummaryData[]) {
    // Using composite key for rep_summary
    return prepareCollectionUpdate(
        data, 
        ActivityRepSummarySchema, 
        // Create a composite key from rep and activity_id 
        (item: ActivityRepSummaryData) => `${item.rep}_${item.activity_id}`
    );
}

export function prepareActivityTimingUpdate(data: ActivityTimingData[]) {
    return prepareCollectionUpdate(data, ActivityTimingSchema, 'Id');
}

export function prepareEntityStateRepSummaryUpdate(data: EntityStateRepSummaryData[]) {
    // Using composite key
    return prepareCollectionUpdate(
        data, 
        EntityStateRepSummarySchema, 
        (item: EntityStateRepSummaryData) => `${item.rep}_${item.entity_type}`
    );
}

export function prepareEntityThroughputRepSummaryUpdate(data: EntityThroughputRepSummaryData[]) {
    // Using composite key
    return prepareCollectionUpdate(
        data, 
        EntityThroughputRepSummarySchema, 
        (item: EntityThroughputRepSummaryData) => `${item.rep}_${item.entity_type}`
    );
}

export function prepareResourceRepSummaryUpdate(data: ResourceRepSummaryData[]) {
    // Using composite key
    return prepareCollectionUpdate(
        data, 
        ResourceRepSummarySchema, 
        (item: ResourceRepSummaryData) => `${item.rep}_${item.resource_id}`
    );
}

export function prepareCompleteActivityMetricsUpdate(data: CompleteActivityMetricsData[]) {
    return prepareCollectionUpdate(data, CompleteActivityMetricsSchema, 'Id');
}

export function prepareCustomMetricsUpdate(data: CustomMetricsData[]) {
    return prepareCollectionUpdate(data, CustomMetricsSchema, 'Id');
}