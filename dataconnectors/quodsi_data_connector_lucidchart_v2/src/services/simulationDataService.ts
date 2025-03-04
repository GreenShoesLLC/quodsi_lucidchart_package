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

export async function fetchCsvData<T>(
    containerName: string,
    blobName: string,
    documentId: string,
    requiredColumns: string[] = []
): Promise<T[]> {
    try {
        // Since documentId IS the container name, we don't need to prefix paths with it
        // Just use the blob name directly
        const fullBlobPath = blobName;

        conditionalLog(`Fetching ${blobName} data for container ${containerName}...`);
        conditionalLog(`Full blob path: ${containerName}/${fullBlobPath}`);

        // Get storage service
        const storage = getStorageService();

        // Fetch CSV content from Azure Blob Storage
        const csvText = await storage.getBlobContent(containerName, fullBlobPath);

        if (!csvText) {
            conditionalWarn(`CSV data not found for ${fullBlobPath}`);
            // Try alternative paths based on naming conventions
            const alternativeBlobPath = `results/${blobName}`;
            conditionalLog(`Trying alternative path: ${containerName}/${alternativeBlobPath}`);

            const alternativeCSVText = await storage.getBlobContent(containerName, alternativeBlobPath);
            if (!alternativeCSVText) {
                conditionalWarn(`CSV data also not found at alternative path ${alternativeBlobPath}`);
                return [];
            }

            conditionalLog(`Found CSV at alternative path! Length: ${alternativeCSVText.length} characters`);
            conditionalLog(`CSV content preview: ${alternativeCSVText.substring(0, 100)}...`);

            // Use the alternative CSV text
            return parseAndValidateCsv(alternativeCSVText, blobName, requiredColumns);
        }

        conditionalLog(`Found CSV! Length: ${csvText.length} characters`);
        conditionalLog(`CSV content preview: ${csvText.substring(0, 100)}...`);

        return parseAndValidateCsv(csvText, blobName, requiredColumns);
    } catch (error) {
        conditionalError(`Error fetching ${blobName} data:`, error);
        throw error;
    }
}

// Helper function to parse and validate CSV data
// Helper function to parse and validate CSV data with duplicate header handling
function parseAndValidateCsv<T>(
    csvText: string,
    blobName: string,
    requiredColumns: string[] = []
): Promise<T[]> {
    return new Promise((resolve) => {
        // First check for duplicate headers
        const firstLineEnd = csvText.indexOf('\n');
        const headerLine = csvText.substring(0, firstLineEnd > 0 ? firstLineEnd : csvText.length);
        const headers = headerLine.split(',');

        // Check for and fix duplicate headers in the CSV content
        const headerCount = new Map<string, number>();
        let fixedCsvText = csvText;
        let duplicatesFound = false;

        // Count occurrences of each header
        headers.forEach(header => {
            const trimmedHeader = header.trim();
            headerCount.set(trimmedHeader, (headerCount.get(trimmedHeader) || 0) + 1);
        });

        // If we found duplicates, replace the header line
        const duplicateHeaders = Array.from(headerCount.entries())
            .filter(([_, count]) => count > 1);

        if (duplicateHeaders.length > 0) {
            duplicatesFound = true;
            conditionalWarn(`CSV ${blobName} has duplicate headers: ${duplicateHeaders.map(([header]) => header).join(', ')}`);

            // Create a new header line with renamed duplicates
            const newHeaders = headers.map((header, index) => {
                const trimmedHeader = header.trim();
                if (headerCount.get(trimmedHeader) > 1) {
                    // Find how many of this header we've seen so far
                    let count = 0;
                    for (let i = 0; i < index; i++) {
                        if (headers[i].trim() === trimmedHeader) {
                            count++;
                        }
                    }

                    // If this is not the first occurrence, add a suffix
                    if (count > 0) {
                        return `${trimmedHeader}_${count}`;
                    }
                }
                return trimmedHeader;
            });

            // Replace the header line in the CSV content
            fixedCsvText = `${newHeaders.join(',')}\n${csvText.substring(firstLineEnd + 1)}`;
            conditionalLog(`Fixed CSV headers: ${newHeaders.join(', ')}`);
        }

        // Now parse the CSV
        parse(fixedCsvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (duplicatesFound) {
                    conditionalLog(`Duplicate headers found and renamed.`);
                }

                const availableColumns = results.meta.fields || [];

                conditionalLog(`CSV ${blobName} parsed with ${results.data.length} rows`);
                conditionalLog(`CSV columns: ${availableColumns.join(', ')}`);

                // Validate that all required columns are present
                if (requiredColumns.length > 0) {
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

                resolve(results.data as T[]);
            },
            error: (error) => {
                conditionalError(`Error parsing CSV ${blobName}:`, error);
                throw error;
            }
        });
    });
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
    const data = await fetchCsvData<ActivityRepSummaryData>(
        containerName,
        'activity_rep_summary.csv',
        documentId,
        activityRepSummaryRequiredColumns
    );

    // Convert activity_id to string immediately after parsing
    return data.map(item => ({
        ...item,
        activity_id: String(item.activity_id)
    }));
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

export async function fetchEntityThroughputRepSummary(containerName: string, documentId: string): Promise<EntityThroughputRepSummaryData[]> {
    const blobName = 'entity_throughput_rep_summary.csv';

    // Note: The documentId IS the container name, so we don't include it in the path
    // We just look for the CSV file directly in the container root
    const fullPath = blobName;

    console.log(`[simulationDataService] Attempting to fetch entity throughput data from: ${containerName}/${fullPath}`);

    try {
        // Try first at the root level
        let result = await fetchCsvData<EntityThroughputRepSummaryData>(
            containerName,
            blobName,
            documentId, // Passing documentId for consistency, though not used in path construction anymore
            entityThroughputRepSummaryRequiredColumns
        );

        // If we didn't find any data at the root level, try in the results folder
        if (result.length === 0) {
            console.log(`[simulationDataService] No data at root level, trying in results folder...`);

            const altBlobName = 'results/entity_throughput_rep_summary.csv';
            result = await fetchCsvData<EntityThroughputRepSummaryData>(
                containerName,
                altBlobName,
                documentId,
                entityThroughputRepSummaryRequiredColumns
            );
        }

        return result;
    } catch (error) {
        console.error(`[simulationDataService] Error fetching entity throughput data: ${error.message}`);
        throw error;
    }
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
    // Ensure activity_id is always a string
    const sanitizedData = data.map(item => ({
        ...item,
        activity_id: String(item.activity_id) // Explicitly convert to string
    }));

    // Using composite key for rep_summary
    return prepareCollectionUpdate(
        sanitizedData,
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
    console.log("Starting special entity throughput update preparation");
    console.log(`Processing ${data.length} rows of entity throughput data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        console.log(`Processing item: ${JSON.stringify(item, null, 2)}`);

        // Create a synthetic ID field that combines entity_type and rep
        // Use whatever format you want for this - it's now a custom field
        const id = `${item.entity_type}_${item.rep}`;

        // Create a completely new object with ONLY the fields we need
        // Including our new synthetic ID field
        const cleanedItem: SerializedFields = {
            id: id, // Add the ID field
            rep: item.rep,
            entity_type: item.entity_type,
            count: item.count,
            completed_count: item.completed_count,
            in_progress_count: item.in_progress_count,
            throughput_rate: item.throughput_rate
        };

        console.log(`Cleaned item with ID ${id}: ${JSON.stringify(cleanedItem, null, 2)}`);

        // Add to our collection using the ID as the key
        items.set(`"${id}"`, cleanedItem);
    });

    console.log(`Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: EntityThroughputRepSummarySchema,
        patch: {
            items
        }
    };
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