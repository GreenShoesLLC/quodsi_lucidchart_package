// services/simulationData/collectors/activityCrossRepCollector.ts
import { ActivityCrossRepSummaryData } from '../../../collections/types/interfaces/ActivityCrossRepSummaryData';
import { ActivityCrossRepSchema } from '../../../collections/activityCrossRepSchema';
import { fetchCsvData, getRequiredColumnsFromType, blobExists, listBlobs } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
// Note: CSV uses _std suffix, not _std_dev. We'll map them after parsing.
// CSV now includes scenario_id and scenario_name directly
export const requiredColumns: string[] = [
    'scenario_id',
    'scenario_name',
    'activity_id',
    'activity_name',
    // Capacity fields
    'capacity',
    'inbound_queue_capacity',
    'outbound_queue_capacity',
    // Inbound queue avg contents
    'inbound_queue_avg_contents_mean',
    'inbound_queue_avg_contents_std',
    'inbound_queue_avg_contents_min',
    'inbound_queue_avg_contents_max',
    // Outbound queue avg contents
    'outbound_queue_avg_contents_mean',
    'outbound_queue_avg_contents_std',
    'outbound_queue_avg_contents_min',
    'outbound_queue_avg_contents_max',
    // Total avg contents
    'total_avg_contents_mean',
    'total_avg_contents_std',
    'total_avg_contents_min',
    'total_avg_contents_max',
    // Utilization
    'capacity_utilization_mean',
    'capacity_utilization_std',
    'capacity_utilization_min',
    'capacity_utilization_max',
    // Active time percentage
    'active_time_pct_mean',
    'active_time_pct_std',
    'active_time_pct_min',
    'active_time_pct_max',
    // Avg number allocated
    'avg_number_allocated_mean',
    'avg_number_allocated_std',
    'avg_number_allocated_min',
    'avg_number_allocated_max',
    // Max number allocated
    'max_number_allocated_mean',
    'max_number_allocated_std',
    'max_number_allocated_min',
    'max_number_allocated_max',
    // Cycle time
    'cycle_time_mean',
    'cycle_time_std',
    'cycle_time_min',
    'cycle_time_max',
    // Total time waiting for resource
    'total_time_waiting_for_resource_mean',
    'total_time_waiting_for_resource_std',
    'total_time_waiting_for_resource_min',
    'total_time_waiting_for_resource_max',
    // Total time blocked
    'total_time_blocked_mean',
    'total_time_blocked_std',
    'total_time_blocked_min',
    'total_time_blocked_max',
    // Total time in failure
    'total_time_in_failure_mean',
    'total_time_in_failure_std',
    'total_time_in_failure_min',
    'total_time_in_failure_max',
    // Flow statistics
    'total_arrivals_mean',
    'total_arrivals_std',
    'total_arrivals_min',
    'total_arrivals_max',
    'total_allocations_mean',
    'total_allocations_std',
    'total_allocations_min',
    'total_allocations_max',
    'throughput_mean',
    'throughput_std',
    'throughput_min',
    'throughput_max',
    // Available time
    'available_time_mean',
    'available_time_std',
    'available_time_min',
    'available_time_max',
    // Total time used
    'total_time_used_mean',
    'total_time_used_std',
    'total_time_used_min',
    'total_time_used_max',
    // Cost metrics
    'fixed_cost_mean',
    'fixed_cost_std',
    'fixed_cost_min',
    'fixed_cost_max',
    'processing_cost_mean',
    'processing_cost_std',
    'processing_cost_min',
    'processing_cost_max',
    'operational_cost_mean',
    'operational_cost_std',
    'operational_cost_min',
    'operational_cost_max',
    'total_cost_mean',
    'total_cost_std',
    'total_cost_min',
    'total_cost_max',
    // Inbound queue stats
    'inbound_queue_stats_mean',
    'inbound_queue_stats_std',
    'inbound_queue_stats_min',
    'inbound_queue_stats_max',
    // Outbound queue stats
    'outbound_queue_stats_mean',
    'outbound_queue_stats_std',
    'outbound_queue_stats_min',
    'outbound_queue_stats_max',
    // Replication count
    'num_replications'
];

/**
 * Fetches activity cross-replication summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID (folder name within container)
 * @returns Array of activity cross-replication summary data
 */
export async function fetchActivityCrossRep(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<ActivityCrossRepSummaryData[]> {
    // Enhanced logging to help diagnose issues
    conditionalLog(`[activityCrossRep] Starting fetch operation`);
    conditionalLog(`[activityCrossRep] Container name: ${containerName}`);
    conditionalLog(`[activityCrossRep] Document ID: ${documentId}`);
    conditionalLog(`[activityCrossRep] Scenario ID: ${scenarioId}`);

    // Use the correct path structure: scenarioId/cross_rep/filename.csv
    // Note: CSV files are in cross_rep subfolder, and use _summary_summary naming
    const baseBlobName = 'cross_rep/activity_summary_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[activityCrossRep] Target file path: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists before trying to fetch it
        conditionalLog(`[activityCrossRep] Checking if file exists at path: ${blobName}`);
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[activityCrossRep] WARNING: File does not exist at path: ${blobName}`);

            // List scenario folder contents to see what files are actually there
            conditionalLog(`[activityCrossRep] Listing files in scenario folder: ${scenarioId}`);
            const scenarioFiles = await listBlobs(containerName, scenarioId);

            if (scenarioFiles.length > 0) {
                conditionalLog(`[activityCrossRep] Found ${scenarioFiles.length} files in scenario folder:`);
                scenarioFiles.forEach(file => conditionalLog(`[activityCrossRep] - ${file}`));

                // Check if there's any file that might contain activity cross-rep data
                const activityFiles = scenarioFiles.filter(file =>
                    file.toLowerCase().includes('activity') &&
                    file.toLowerCase().includes('cross') &&
                    file.endsWith('.csv')
                );

                if (activityFiles.length > 0) {
                    conditionalLog(`[activityCrossRep] Found potential activity cross-rep files with different names:`);
                    activityFiles.forEach(file => conditionalLog(`[activityCrossRep] - ${file}`));
                }
            } else {
                conditionalLog(`[activityCrossRep] No files found in scenario folder: ${scenarioId}`);

                // Check if the scenario folder itself exists
                conditionalLog(`[activityCrossRep] Checking top-level folders in container`);
                const topLevelBlobs = await listBlobs(containerName);
                const folders = new Set<string>();

                topLevelBlobs.forEach(blob => {
                    const parts = blob.split('/');
                    if (parts.length > 1) {
                        folders.add(parts[0]);
                    }
                });

                conditionalLog(`[activityCrossRep] Found top-level folders: ${Array.from(folders).join(', ')}`);

                if (!folders.has(scenarioId)) {
                    conditionalLog(`[activityCrossRep] WARNING: Scenario folder ${scenarioId} not found in container!`);
                }
            }

            return [];
        }

        // Now fetch the data since we know the file exists
        conditionalLog(`[activityCrossRep] File exists. Fetching data...`);
        let result = await fetchCsvData<any>(  // Use 'any' since CSV has different column names
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[activityCrossRep] Fetched ${result.length} activity cross-rep records`);
        if (result.length > 0) {
            conditionalLog(`[activityCrossRep] First record sample (before mapping): ${JSON.stringify(result[0])}`);
        }

        // Map CSV column names to schema field names
        // CSV uses _std suffix, schema expects _std_dev
        // CSV now includes scenario_id and scenario_name directly
        const mappedResult: ActivityCrossRepSummaryData[] = result.map((item: any) => ({
            // Generate composite ID from scenario and activity
            id: `${item.scenario_id}_${item.activity_id}`,
            scenario_id: item.scenario_id,
            scenario_name: item.scenario_name,

            // Copy identifier fields
            activity_id: item.activity_id,
            activity_name: item.activity_name,

            // Capacity fields
            capacity: item.capacity,
            inbound_queue_capacity: item.inbound_queue_capacity,
            outbound_queue_capacity: item.outbound_queue_capacity,

            // Inbound queue avg contents
            inbound_queue_avg_contents_mean: item.inbound_queue_avg_contents_mean,
            inbound_queue_avg_contents_std_dev: item.inbound_queue_avg_contents_std,
            inbound_queue_avg_contents_min: item.inbound_queue_avg_contents_min,
            inbound_queue_avg_contents_max: item.inbound_queue_avg_contents_max,

            // Outbound queue avg contents
            outbound_queue_avg_contents_mean: item.outbound_queue_avg_contents_mean,
            outbound_queue_avg_contents_std_dev: item.outbound_queue_avg_contents_std,
            outbound_queue_avg_contents_min: item.outbound_queue_avg_contents_min,
            outbound_queue_avg_contents_max: item.outbound_queue_avg_contents_max,

            // Total avg contents
            total_avg_contents_mean: item.total_avg_contents_mean,
            total_avg_contents_std_dev: item.total_avg_contents_std,
            total_avg_contents_min: item.total_avg_contents_min,
            total_avg_contents_max: item.total_avg_contents_max,

            // Utilization - Map _std to _std_dev
            capacity_utilization_mean: item.capacity_utilization_mean,
            capacity_utilization_min: item.capacity_utilization_min,
            capacity_utilization_max: item.capacity_utilization_max,
            capacity_utilization_std_dev: item.capacity_utilization_std,

            // Active time percentage
            active_time_pct_mean: item.active_time_pct_mean,
            active_time_pct_min: item.active_time_pct_min,
            active_time_pct_max: item.active_time_pct_max,
            active_time_pct_std_dev: item.active_time_pct_std,

            // Avg number allocated
            avg_number_allocated_mean: item.avg_number_allocated_mean,
            avg_number_allocated_min: item.avg_number_allocated_min,
            avg_number_allocated_max: item.avg_number_allocated_max,
            avg_number_allocated_std_dev: item.avg_number_allocated_std,

            // Max number allocated
            max_number_allocated_mean: item.max_number_allocated_mean,
            max_number_allocated_min: item.max_number_allocated_min,
            max_number_allocated_max: item.max_number_allocated_max,
            max_number_allocated_std_dev: item.max_number_allocated_std,

            // Cycle time
            cycle_time_mean: item.cycle_time_mean,
            cycle_time_min: item.cycle_time_min,
            cycle_time_max: item.cycle_time_max,
            cycle_time_std_dev: item.cycle_time_std,

            // Total time waiting for resource
            total_time_waiting_for_resource_mean: item.total_time_waiting_for_resource_mean,
            total_time_waiting_for_resource_min: item.total_time_waiting_for_resource_min,
            total_time_waiting_for_resource_max: item.total_time_waiting_for_resource_max,
            total_time_waiting_for_resource_std_dev: item.total_time_waiting_for_resource_std,

            // Total time blocked
            total_time_blocked_mean: item.total_time_blocked_mean,
            total_time_blocked_min: item.total_time_blocked_min,
            total_time_blocked_max: item.total_time_blocked_max,
            total_time_blocked_std_dev: item.total_time_blocked_std,

            // Total time in failure
            total_time_in_failure_mean: item.total_time_in_failure_mean,
            total_time_in_failure_min: item.total_time_in_failure_min,
            total_time_in_failure_max: item.total_time_in_failure_max,
            total_time_in_failure_std_dev: item.total_time_in_failure_std,

            // Flow statistics
            total_arrivals_mean: item.total_arrivals_mean,
            total_arrivals_min: item.total_arrivals_min,
            total_arrivals_max: item.total_arrivals_max,
            total_arrivals_std_dev: item.total_arrivals_std,

            total_allocations_mean: item.total_allocations_mean,
            total_allocations_min: item.total_allocations_min,
            total_allocations_max: item.total_allocations_max,
            total_allocations_std_dev: item.total_allocations_std,

            throughput_mean: item.throughput_mean,
            throughput_min: item.throughput_min,
            throughput_max: item.throughput_max,
            throughput_std_dev: item.throughput_std,

            // Available time metrics
            available_time_mean: item.available_time_mean,
            available_time_std_dev: item.available_time_std,
            available_time_min: item.available_time_min,
            available_time_max: item.available_time_max,

            // Total time used metrics
            total_time_used_mean: item.total_time_used_mean,
            total_time_used_std_dev: item.total_time_used_std,
            total_time_used_min: item.total_time_used_min,
            total_time_used_max: item.total_time_used_max,

            // Cost metrics
            fixed_cost_mean: item.fixed_cost_mean,
            fixed_cost_std_dev: item.fixed_cost_std,
            fixed_cost_min: item.fixed_cost_min,
            fixed_cost_max: item.fixed_cost_max,
            processing_cost_mean: item.processing_cost_mean,
            processing_cost_std_dev: item.processing_cost_std,
            processing_cost_min: item.processing_cost_min,
            processing_cost_max: item.processing_cost_max,
            operational_cost_mean: item.operational_cost_mean,
            operational_cost_std_dev: item.operational_cost_std,
            operational_cost_min: item.operational_cost_min,
            operational_cost_max: item.operational_cost_max,
            total_cost_mean: item.total_cost_mean,
            total_cost_std_dev: item.total_cost_std,
            total_cost_min: item.total_cost_min,
            total_cost_max: item.total_cost_max,

            // Inbound queue stats
            inbound_queue_stats_mean: item.inbound_queue_stats_mean,
            inbound_queue_stats_std_dev: item.inbound_queue_stats_std,
            inbound_queue_stats_min: item.inbound_queue_stats_min,
            inbound_queue_stats_max: item.inbound_queue_stats_max,

            // Outbound queue stats
            outbound_queue_stats_mean: item.outbound_queue_stats_mean,
            outbound_queue_stats_std_dev: item.outbound_queue_stats_std,
            outbound_queue_stats_min: item.outbound_queue_stats_min,
            outbound_queue_stats_max: item.outbound_queue_stats_max,

            // Replication count
            num_replications: item.num_replications
        }));

        conditionalLog(`[activityCrossRep] Mapped ${mappedResult.length} records with schema-compliant field names`);
        if (mappedResult.length > 0) {
            conditionalLog(`[activityCrossRep] First mapped record sample: ${JSON.stringify(mappedResult[0])}`);
        }

        // Replace result with mapped result
        result = mappedResult;

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: ActivityCrossRepSummaryData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || "Unknown"),
                scenario_name: String(item.scenario_name || "Unknown"),
                activity_id: String(item.activity_id || "Unknown"),
                activity_name: String(item.activity_name || "Unknown"),

                // Capacity fields
                capacity: item.capacity ?? 0,
                inbound_queue_capacity: item.inbound_queue_capacity ?? 0,
                outbound_queue_capacity: item.outbound_queue_capacity ?? 0,

                // Inbound queue avg contents
                inbound_queue_avg_contents_mean: item.inbound_queue_avg_contents_mean ?? 0,
                inbound_queue_avg_contents_std_dev: item.inbound_queue_avg_contents_std_dev ?? 0,
                inbound_queue_avg_contents_min: item.inbound_queue_avg_contents_min ?? 0,
                inbound_queue_avg_contents_max: item.inbound_queue_avg_contents_max ?? 0,

                // Outbound queue avg contents
                outbound_queue_avg_contents_mean: item.outbound_queue_avg_contents_mean ?? 0,
                outbound_queue_avg_contents_std_dev: item.outbound_queue_avg_contents_std_dev ?? 0,
                outbound_queue_avg_contents_min: item.outbound_queue_avg_contents_min ?? 0,
                outbound_queue_avg_contents_max: item.outbound_queue_avg_contents_max ?? 0,

                // Total avg contents
                total_avg_contents_mean: item.total_avg_contents_mean ?? 0,
                total_avg_contents_std_dev: item.total_avg_contents_std_dev ?? 0,
                total_avg_contents_min: item.total_avg_contents_min ?? 0,
                total_avg_contents_max: item.total_avg_contents_max ?? 0,

                // Utilization metrics
                capacity_utilization_mean: item.capacity_utilization_mean ?? 0,
                capacity_utilization_min: item.capacity_utilization_min ?? 0,
                capacity_utilization_max: item.capacity_utilization_max ?? 0,
                capacity_utilization_std_dev: item.capacity_utilization_std_dev ?? 0,

                // Active time percentage metrics
                active_time_pct_mean: item.active_time_pct_mean ?? 0,
                active_time_pct_min: item.active_time_pct_min ?? 0,
                active_time_pct_max: item.active_time_pct_max ?? 0,
                active_time_pct_std_dev: item.active_time_pct_std_dev ?? 0,

                // Avg Number Allocated metrics
                avg_number_allocated_mean: item.avg_number_allocated_mean ?? 0,
                avg_number_allocated_min: item.avg_number_allocated_min ?? 0,
                avg_number_allocated_max: item.avg_number_allocated_max ?? 0,
                avg_number_allocated_std_dev: item.avg_number_allocated_std_dev ?? 0,

                // Max number allocated metrics
                max_number_allocated_mean: item.max_number_allocated_mean ?? 0,
                max_number_allocated_min: item.max_number_allocated_min ?? 0,
                max_number_allocated_max: item.max_number_allocated_max ?? 0,
                max_number_allocated_std_dev: item.max_number_allocated_std_dev ?? 0,

                // Cycle time metrics
                cycle_time_mean: item.cycle_time_mean ?? 0,
                cycle_time_min: item.cycle_time_min ?? 0,
                cycle_time_max: item.cycle_time_max ?? 0,
                cycle_time_std_dev: item.cycle_time_std_dev ?? 0,

                // Total Time Waiting for Resource metrics
                total_time_waiting_for_resource_mean: item.total_time_waiting_for_resource_mean ?? 0,
                total_time_waiting_for_resource_min: item.total_time_waiting_for_resource_min ?? 0,
                total_time_waiting_for_resource_max: item.total_time_waiting_for_resource_max ?? 0,
                total_time_waiting_for_resource_std_dev: item.total_time_waiting_for_resource_std_dev ?? 0,

                // Total Time Blocked metrics
                total_time_blocked_mean: item.total_time_blocked_mean ?? 0,
                total_time_blocked_min: item.total_time_blocked_min ?? 0,
                total_time_blocked_max: item.total_time_blocked_max ?? 0,
                total_time_blocked_std_dev: item.total_time_blocked_std_dev ?? 0,

                // Total Time In Failure metrics
                total_time_in_failure_mean: item.total_time_in_failure_mean ?? 0,
                total_time_in_failure_min: item.total_time_in_failure_min ?? 0,
                total_time_in_failure_max: item.total_time_in_failure_max ?? 0,
                total_time_in_failure_std_dev: item.total_time_in_failure_std_dev ?? 0,

                // Flow statistics
                total_arrivals_mean: item.total_arrivals_mean ?? 0,
                total_arrivals_min: item.total_arrivals_min ?? 0,
                total_arrivals_max: item.total_arrivals_max ?? 0,
                total_arrivals_std_dev: item.total_arrivals_std_dev ?? 0,
                total_allocations_mean: item.total_allocations_mean ?? 0,
                total_allocations_min: item.total_allocations_min ?? 0,
                total_allocations_max: item.total_allocations_max ?? 0,
                total_allocations_std_dev: item.total_allocations_std_dev ?? 0,
                throughput_mean: item.throughput_mean ?? 0,
                throughput_min: item.throughput_min ?? 0,
                throughput_max: item.throughput_max ?? 0,
                throughput_std_dev: item.throughput_std_dev ?? 0,

                // Available time metrics
                available_time_mean: item.available_time_mean ?? 0,
                available_time_std_dev: item.available_time_std_dev ?? 0,
                available_time_min: item.available_time_min ?? 0,
                available_time_max: item.available_time_max ?? 0,

                // Total time used metrics
                total_time_used_mean: item.total_time_used_mean ?? 0,
                total_time_used_std_dev: item.total_time_used_std_dev ?? 0,
                total_time_used_min: item.total_time_used_min ?? 0,
                total_time_used_max: item.total_time_used_max ?? 0,

                // Cost metrics
                fixed_cost_mean: item.fixed_cost_mean ?? 0,
                fixed_cost_std_dev: item.fixed_cost_std_dev ?? 0,
                fixed_cost_min: item.fixed_cost_min ?? 0,
                fixed_cost_max: item.fixed_cost_max ?? 0,
                processing_cost_mean: item.processing_cost_mean ?? 0,
                processing_cost_std_dev: item.processing_cost_std_dev ?? 0,
                processing_cost_min: item.processing_cost_min ?? 0,
                processing_cost_max: item.processing_cost_max ?? 0,
                operational_cost_mean: item.operational_cost_mean ?? 0,
                operational_cost_std_dev: item.operational_cost_std_dev ?? 0,
                operational_cost_min: item.operational_cost_min ?? 0,
                operational_cost_max: item.operational_cost_max ?? 0,
                total_cost_mean: item.total_cost_mean ?? 0,
                total_cost_std_dev: item.total_cost_std_dev ?? 0,
                total_cost_min: item.total_cost_min ?? 0,
                total_cost_max: item.total_cost_max ?? 0,

                // Inbound queue stats
                inbound_queue_stats_mean: item.inbound_queue_stats_mean ?? 0,
                inbound_queue_stats_std_dev: item.inbound_queue_stats_std_dev ?? 0,
                inbound_queue_stats_min: item.inbound_queue_stats_min ?? 0,
                inbound_queue_stats_max: item.inbound_queue_stats_max ?? 0,

                // Outbound queue stats
                outbound_queue_stats_mean: item.outbound_queue_stats_mean ?? 0,
                outbound_queue_stats_std_dev: item.outbound_queue_stats_std_dev ?? 0,
                outbound_queue_stats_min: item.outbound_queue_stats_min ?? 0,
                outbound_queue_stats_max: item.outbound_queue_stats_max ?? 0,

                // Replication count
                num_replications: item.num_replications ?? 0
            };

            return validItem;
        });

        conditionalLog(`[activityCrossRep] Validated and prepared ${validatedResult.length} activity cross-rep records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[activityCrossRep] Error fetching activity cross-rep data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares activity cross-replication summary data for Lucid update
 * @param data Array of activity cross-replication summary data
 * @returns Collection update for Lucid
 */
export function prepareActivityCrossRepUpdate(data: ActivityCrossRepSummaryData[]) {
    conditionalLog("[activityCrossRep] Starting activity cross-rep update preparation");
    conditionalLog(`[activityCrossRep] Processing ${data.length} rows of activity cross-rep data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        conditionalLog(`[activityCrossRep] Processing item with activity_id ${item.activity_id}`);

        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || "Unknown"),
            scenario_name: String(item.scenario_name || "Unknown"),
            activity_id: String(item.activity_id || "Unknown"),
            activity_name: String(item.activity_name || "Unknown"),

            // Capacity fields
            capacity: item.capacity ?? 0,
            inbound_queue_capacity: item.inbound_queue_capacity ?? 0,
            outbound_queue_capacity: item.outbound_queue_capacity ?? 0,

            // Inbound queue avg contents
            inbound_queue_avg_contents_mean: item.inbound_queue_avg_contents_mean ?? 0,
            inbound_queue_avg_contents_std_dev: item.inbound_queue_avg_contents_std_dev ?? 0,
            inbound_queue_avg_contents_min: item.inbound_queue_avg_contents_min ?? 0,
            inbound_queue_avg_contents_max: item.inbound_queue_avg_contents_max ?? 0,

            // Outbound queue avg contents
            outbound_queue_avg_contents_mean: item.outbound_queue_avg_contents_mean ?? 0,
            outbound_queue_avg_contents_std_dev: item.outbound_queue_avg_contents_std_dev ?? 0,
            outbound_queue_avg_contents_min: item.outbound_queue_avg_contents_min ?? 0,
            outbound_queue_avg_contents_max: item.outbound_queue_avg_contents_max ?? 0,

            // Total avg contents
            total_avg_contents_mean: item.total_avg_contents_mean ?? 0,
            total_avg_contents_std_dev: item.total_avg_contents_std_dev ?? 0,
            total_avg_contents_min: item.total_avg_contents_min ?? 0,
            total_avg_contents_max: item.total_avg_contents_max ?? 0,

            // Utilization metrics
            capacity_utilization_mean: item.capacity_utilization_mean ?? 0,
            capacity_utilization_min: item.capacity_utilization_min ?? 0,
            capacity_utilization_max: item.capacity_utilization_max ?? 0,
            capacity_utilization_std_dev: item.capacity_utilization_std_dev ?? 0,

            // Active time percentage metrics
            active_time_pct_mean: item.active_time_pct_mean ?? 0,
            active_time_pct_min: item.active_time_pct_min ?? 0,
            active_time_pct_max: item.active_time_pct_max ?? 0,
            active_time_pct_std_dev: item.active_time_pct_std_dev ?? 0,

            // Avg Number Allocated metrics
            avg_number_allocated_mean: item.avg_number_allocated_mean ?? 0,
            avg_number_allocated_min: item.avg_number_allocated_min ?? 0,
            avg_number_allocated_max: item.avg_number_allocated_max ?? 0,
            avg_number_allocated_std_dev: item.avg_number_allocated_std_dev ?? 0,

            // Max number allocated metrics
            max_number_allocated_mean: item.max_number_allocated_mean ?? 0,
            max_number_allocated_min: item.max_number_allocated_min ?? 0,
            max_number_allocated_max: item.max_number_allocated_max ?? 0,
            max_number_allocated_std_dev: item.max_number_allocated_std_dev ?? 0,

            // Cycle time metrics
            cycle_time_mean: item.cycle_time_mean ?? 0,
            cycle_time_min: item.cycle_time_min ?? 0,
            cycle_time_max: item.cycle_time_max ?? 0,
            cycle_time_std_dev: item.cycle_time_std_dev ?? 0,

            // Total Time Waiting for Resource metrics
            total_time_waiting_for_resource_mean: item.total_time_waiting_for_resource_mean ?? 0,
            total_time_waiting_for_resource_min: item.total_time_waiting_for_resource_min ?? 0,
            total_time_waiting_for_resource_max: item.total_time_waiting_for_resource_max ?? 0,
            total_time_waiting_for_resource_std_dev: item.total_time_waiting_for_resource_std_dev ?? 0,

            // Total Time Blocked metrics
            total_time_blocked_mean: item.total_time_blocked_mean ?? 0,
            total_time_blocked_min: item.total_time_blocked_min ?? 0,
            total_time_blocked_max: item.total_time_blocked_max ?? 0,
            total_time_blocked_std_dev: item.total_time_blocked_std_dev ?? 0,

            // Total Time In Failure metrics
            total_time_in_failure_mean: item.total_time_in_failure_mean ?? 0,
            total_time_in_failure_min: item.total_time_in_failure_min ?? 0,
            total_time_in_failure_max: item.total_time_in_failure_max ?? 0,
            total_time_in_failure_std_dev: item.total_time_in_failure_std_dev ?? 0,

            // Flow statistics
            total_arrivals_mean: item.total_arrivals_mean ?? 0,
            total_arrivals_min: item.total_arrivals_min ?? 0,
            total_arrivals_max: item.total_arrivals_max ?? 0,
            total_arrivals_std_dev: item.total_arrivals_std_dev ?? 0,
            total_allocations_mean: item.total_allocations_mean ?? 0,
            total_allocations_min: item.total_allocations_min ?? 0,
            total_allocations_max: item.total_allocations_max ?? 0,
            total_allocations_std_dev: item.total_allocations_std_dev ?? 0,
            throughput_mean: item.throughput_mean ?? 0,
            throughput_min: item.throughput_min ?? 0,
            throughput_max: item.throughput_max ?? 0,
            throughput_std_dev: item.throughput_std_dev ?? 0,

            // Available time metrics
            available_time_mean: item.available_time_mean ?? 0,
            available_time_std_dev: item.available_time_std_dev ?? 0,
            available_time_min: item.available_time_min ?? 0,
            available_time_max: item.available_time_max ?? 0,

            // Total time used metrics
            total_time_used_mean: item.total_time_used_mean ?? 0,
            total_time_used_std_dev: item.total_time_used_std_dev ?? 0,
            total_time_used_min: item.total_time_used_min ?? 0,
            total_time_used_max: item.total_time_used_max ?? 0,

            // Cost metrics
            fixed_cost_mean: item.fixed_cost_mean ?? 0,
            fixed_cost_std_dev: item.fixed_cost_std_dev ?? 0,
            fixed_cost_min: item.fixed_cost_min ?? 0,
            fixed_cost_max: item.fixed_cost_max ?? 0,
            processing_cost_mean: item.processing_cost_mean ?? 0,
            processing_cost_std_dev: item.processing_cost_std_dev ?? 0,
            processing_cost_min: item.processing_cost_min ?? 0,
            processing_cost_max: item.processing_cost_max ?? 0,
            operational_cost_mean: item.operational_cost_mean ?? 0,
            operational_cost_std_dev: item.operational_cost_std_dev ?? 0,
            operational_cost_min: item.operational_cost_min ?? 0,
            operational_cost_max: item.operational_cost_max ?? 0,
            total_cost_mean: item.total_cost_mean ?? 0,
            total_cost_std_dev: item.total_cost_std_dev ?? 0,
            total_cost_min: item.total_cost_min ?? 0,
            total_cost_max: item.total_cost_max ?? 0,

            // Inbound queue stats
            inbound_queue_stats_mean: item.inbound_queue_stats_mean ?? 0,
            inbound_queue_stats_std_dev: item.inbound_queue_stats_std_dev ?? 0,
            inbound_queue_stats_min: item.inbound_queue_stats_min ?? 0,
            inbound_queue_stats_max: item.inbound_queue_stats_max ?? 0,

            // Outbound queue stats
            outbound_queue_stats_mean: item.outbound_queue_stats_mean ?? 0,
            outbound_queue_stats_std_dev: item.outbound_queue_stats_std_dev ?? 0,
            outbound_queue_stats_min: item.outbound_queue_stats_min ?? 0,
            outbound_queue_stats_max: item.outbound_queue_stats_max ?? 0,

            // Replication count
            num_replications: item.num_replications ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[activityCrossRep] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: ActivityCrossRepSchema,
        patch: {
            items
        }
    };
}
