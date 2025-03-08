// services/simulationData/collectors/activityRepSummary.ts
import { ActivityRepSummaryData } from '../../../collections/types/interfaces/ActivityRepSummaryData';
import { ActivityRepSummarySchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<ActivityRepSummaryData>([
    'rep', 'activity_id', 'capacity', 'total_available_clock', 'total_arrivals',
    'total_requests', 'total_captures', 'total_releases', 'total_time_in_capture',
    'utilization_percentage', 'throughput_rate'
]);

/**
 * Fetches activity rep summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @returns Array of activity rep summary data
 */
export async function fetchData(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<ActivityRepSummaryData[]> {
    const baseBlobName = 'activity_rep_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`

    conditionalLog(`[activityRepSummary] Attempting to fetch activity rep summary data from: ${containerName}/${blobName}`);

    try {
        // Try first at the root level
        let result = await fetchCsvData<ActivityRepSummaryData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        // If we didn't find any data at the root level, try in the results folder
        if (result.length === 0) {
            conditionalLog(`[activityRepSummary] No data at root level, trying in results folder...`);

            const altBlobName = 'results/activity_rep_summary.csv';
            result = await fetchCsvData<ActivityRepSummaryData>(
                containerName,
                altBlobName,
                documentId,
                requiredColumns
            );
        }

        conditionalLog(`[activityRepSummary] Fetched ${result.length} activity rep summary records`);
        if (result.length > 0) {
            conditionalLog(`[activityRepSummary] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Convert activity_id to string immediately
            const activityId = String(item.activity_id || 'unknown_activity');
            
            // Generate an id using rep and activity_id
            const id = `${item.rep || 0}_${activityId}`;
            
            // Create a new object with defaults for all required fields
            const validItem: ActivityRepSummaryData = {
                id,
                rep: item.rep || 0,
                activity_id: activityId,
                capacity: item.capacity ?? 0,
                total_available_clock: item.total_available_clock ?? 0,
                total_arrivals: item.total_arrivals ?? 0,
                total_requests: item.total_requests ?? 0,
                total_captures: item.total_captures ?? 0,
                total_releases: item.total_releases ?? 0,
                total_time_in_capture: item.total_time_in_capture ?? 0,
                total_time_blocked: item.total_time_blocked ?? 0,
                total_time_waiting: item.total_time_waiting ?? 0,
                average_contents: item.average_contents ?? 0,
                maximum_contents: item.maximum_contents ?? 0,
                current_contents: item.current_contents ?? 0,
                utilization_percentage: item.utilization_percentage ?? 0,
                throughput_rate: item.throughput_rate ?? 0,
                average_time_per_entry: item.average_time_per_entry ?? 0,
                average_queue_length: item.average_queue_length ?? 0,
                input_buffer_utilization: item.input_buffer_utilization ?? 0,
                output_buffer_utilization: item.output_buffer_utilization ?? 0,
                input_buffer_queue_time: item.input_buffer_queue_time ?? 0,
                output_buffer_queue_time: item.output_buffer_queue_time ?? 0,
                min_service_time: item.min_service_time ?? 0,
                max_service_time: item.max_service_time ?? 0,
                avg_service_time: item.avg_service_time ?? 0,
                service_time_variance: item.service_time_variance ?? 0,
                total_time_blocked_upstream: item.total_time_blocked_upstream ?? 0,
                total_time_blocked_downstream: item.total_time_blocked_downstream ?? 0,
                blocking_frequency: item.blocking_frequency ?? 0,
                resource_starvation_time: item.resource_starvation_time ?? 0,
                resource_conflict_count: item.resource_conflict_count ?? 0,
                operational_efficiency: item.operational_efficiency ?? 0,
                cycle_time_efficiency: item.cycle_time_efficiency ?? 0,
                first_time_through: item.first_time_through ?? 0
            };
            
            return validItem;
        });

        conditionalLog(`[activityRepSummary] Validated and prepared ${validatedResult.length} activity rep summary records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[activityRepSummary] Error fetching activity rep summary data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares activity rep summary data for Lucid update
 * @param data Array of activity rep summary data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: ActivityRepSummaryData[]) {
    conditionalLog("[activityRepSummary] Starting activity rep summary update preparation");
    conditionalLog(`[activityRepSummary] Processing ${data.length} rows of activity rep summary data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        // Ensure activity_id is always a string
        const activityId = String(item.activity_id || 'unknown_activity');
        
        // Create the composite key for this item
        const id = item.id || `${item.rep || 0}_${activityId}`;
        
        conditionalLog(`[activityRepSummary] Processing item with ID ${id}`);

        // Create a completely new object with no null values
        const cleanedItem: SerializedFields = {
            id,
            rep: item.rep || 0,
            activity_id: activityId,
            capacity: item.capacity ?? 0,
            total_available_clock: item.total_available_clock ?? 0,
            total_arrivals: item.total_arrivals ?? 0,
            total_requests: item.total_requests ?? 0,
            total_captures: item.total_captures ?? 0,
            total_releases: item.total_releases ?? 0,
            total_time_in_capture: item.total_time_in_capture ?? 0,
            total_time_blocked: item.total_time_blocked ?? 0,
            total_time_waiting: item.total_time_waiting ?? 0,
            average_contents: item.average_contents ?? 0,
            maximum_contents: item.maximum_contents ?? 0,
            current_contents: item.current_contents ?? 0,
            utilization_percentage: item.utilization_percentage ?? 0,
            throughput_rate: item.throughput_rate ?? 0,
            average_time_per_entry: item.average_time_per_entry ?? 0,
            average_queue_length: item.average_queue_length ?? 0,
            input_buffer_utilization: item.input_buffer_utilization ?? 0,
            output_buffer_utilization: item.output_buffer_utilization ?? 0,
            input_buffer_queue_time: item.input_buffer_queue_time ?? 0,
            output_buffer_queue_time: item.output_buffer_queue_time ?? 0,
            min_service_time: item.min_service_time ?? 0,
            max_service_time: item.max_service_time ?? 0,
            avg_service_time: item.avg_service_time ?? 0,
            service_time_variance: item.service_time_variance ?? 0,
            total_time_blocked_upstream: item.total_time_blocked_upstream ?? 0,
            total_time_blocked_downstream: item.total_time_blocked_downstream ?? 0,
            blocking_frequency: item.blocking_frequency ?? 0,
            resource_starvation_time: item.resource_starvation_time ?? 0,
            resource_conflict_count: item.resource_conflict_count ?? 0,
            operational_efficiency: item.operational_efficiency ?? 0,
            cycle_time_efficiency: item.cycle_time_efficiency ?? 0,
            first_time_through: item.first_time_through ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${id}"`, cleanedItem);
    });

    conditionalLog(`[activityRepSummary] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: ActivityRepSummarySchema,
        patch: {
            items
        }
    };
}
