// services/simulationData/collectors/entityCrossRepCollector.ts
import { EntityCrossRepSummaryData } from '../../../collections/types/interfaces/EntityCrossRepSummaryData';
import { EntityCrossRepSchema } from '../../../collections/entityCrossRepSchema';
import { fetchCsvData, blobExists, listBlobs } from '../csvParser';
import { conditionalLog, conditionalError } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation - matches CSV format
// CSV uses _std suffix, we map to _std_dev in interface
export const requiredColumns: string[] = [
    'scenario_id',
    'scenario_name',
    'entity_type',
    // Created (total_created in CSV)
    'total_created_mean',
    'total_created_std',
    'total_created_min',
    'total_created_max',
    // Completed count
    'completed_count_mean',
    'completed_count_std',
    'completed_count_min',
    'completed_count_max',
    // In progress count
    'in_progress_count_mean',
    'in_progress_count_std',
    'in_progress_count_min',
    'in_progress_count_max',
    // Interval
    'interval_mean',
    'interval_std',
    'interval_min',
    'interval_max',
    // Throughput rate
    'throughput_rate_mean',
    'throughput_rate_std',
    'throughput_rate_min',
    'throughput_rate_max',
    // Overall interval
    'overall_interval_mean',
    'overall_interval_std',
    'overall_interval_min',
    'overall_interval_max',
    // Time in system
    'time_in_system_mean',
    'time_in_system_std',
    'time_in_system_min',
    'time_in_system_max',
    // Time waiting
    'time_waiting_mean',
    'time_waiting_std',
    'time_waiting_min',
    'time_waiting_max',
    // Time blocked
    'time_blocked_mean',
    'time_blocked_std',
    'time_blocked_min',
    'time_blocked_max',
    // Time in operation
    'time_in_operation_mean',
    'time_in_operation_std',
    'time_in_operation_min',
    'time_in_operation_max',
    // Time connecting
    'time_connecting_mean',
    'time_connecting_std',
    'time_connecting_min',
    'time_connecting_max',
    // Percent waiting
    'percent_waiting_mean',
    'percent_waiting_std',
    'percent_waiting_min',
    'percent_waiting_max',
    // Percent blocked
    'percent_blocked_mean',
    'percent_blocked_std',
    'percent_blocked_min',
    'percent_blocked_max',
    // Percent operation
    'percent_operation_mean',
    'percent_operation_std',
    'percent_operation_min',
    'percent_operation_max',
    // Percent connecting
    'percent_connecting_mean',
    'percent_connecting_std',
    'percent_connecting_min',
    'percent_connecting_max',
    // WIP stats
    'trough_wip_mean',
    'trough_wip_std',
    'trough_wip_min',
    'trough_wip_max',
    'peak_wip_mean',
    'peak_wip_std',
    'peak_wip_min',
    'peak_wip_max',
    'avg_wip_mean',
    'avg_wip_std',
    'avg_wip_min',
    'avg_wip_max',
    // Replication count
    'num_replications'
];

/**
 * Fetches entity cross-replication summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID (folder name within container)
 * @returns Array of entity cross-replication summary data
 */
export async function fetchEntityCrossRep(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<EntityCrossRepSummaryData[]> {
    conditionalLog(`[entityCrossRep] Starting fetch operation`);
    conditionalLog(`[entityCrossRep] Container name: ${containerName}`);
    conditionalLog(`[entityCrossRep] Document ID: ${documentId}`);
    conditionalLog(`[entityCrossRep] Scenario ID: ${scenarioId}`);

    const baseBlobName = 'cross_rep/entity_summary_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[entityCrossRep] Target file path: ${containerName}/${blobName}`);

    try {
        conditionalLog(`[entityCrossRep] Checking if file exists at path: ${blobName}`);
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[entityCrossRep] WARNING: File does not exist at path: ${blobName}`);

            const scenarioFiles = await listBlobs(containerName, scenarioId);
            if (scenarioFiles.length > 0) {
                conditionalLog(`[entityCrossRep] Found ${scenarioFiles.length} files in scenario folder`);
                const entityFiles = scenarioFiles.filter(file =>
                    file.toLowerCase().includes('entity') &&
                    file.toLowerCase().includes('cross') &&
                    file.endsWith('.csv')
                );
                if (entityFiles.length > 0) {
                    conditionalLog(`[entityCrossRep] Found potential entity files: ${entityFiles.join(', ')}`);
                }
            }
            return [];
        }

        conditionalLog(`[entityCrossRep] File exists. Fetching data...`);
        let result = await fetchCsvData<any>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[entityCrossRep] Fetched ${result.length} entity cross-rep records`);
        if (result.length > 0) {
            conditionalLog(`[entityCrossRep] First record sample (before mapping): ${JSON.stringify(result[0])}`);
        }

        // Map CSV column names to schema field names
        const mappedResult: EntityCrossRepSummaryData[] = result.map((item: any) => ({
            // Generate composite ID from scenario and entity type
            id: `${item.scenario_id}_${item.entity_type}`,
            scenario_id: item.scenario_id,
            scenario_name: item.scenario_name,

            // Map entity_type to both entity_id and entity_name
            entity_id: item.entity_type,
            entity_name: item.entity_type,

            // Created statistics (total_created in CSV)
            created_mean: item.total_created_mean,
            created_std_dev: item.total_created_std,
            created_min: item.total_created_min,
            created_max: item.total_created_max,

            // Completed count statistics
            completed_count_mean: item.completed_count_mean,
            completed_count_std_dev: item.completed_count_std,
            completed_count_min: item.completed_count_min,
            completed_count_max: item.completed_count_max,

            // In progress count statistics
            in_progress_count_mean: item.in_progress_count_mean,
            in_progress_count_std_dev: item.in_progress_count_std,
            in_progress_count_min: item.in_progress_count_min,
            in_progress_count_max: item.in_progress_count_max,

            // Interval statistics
            interval_mean: item.interval_mean,
            interval_std_dev: item.interval_std,
            interval_min: item.interval_min,
            interval_max: item.interval_max,

            // Throughput rate statistics
            throughput_rate_mean: item.throughput_rate_mean,
            throughput_rate_std_dev: item.throughput_rate_std,
            throughput_rate_min: item.throughput_rate_min,
            throughput_rate_max: item.throughput_rate_max,

            // Overall interval statistics
            overall_interval_mean: item.overall_interval_mean,
            overall_interval_std_dev: item.overall_interval_std,
            overall_interval_min: item.overall_interval_min,
            overall_interval_max: item.overall_interval_max,

            // Time in system statistics
            time_in_system_mean: item.time_in_system_mean,
            time_in_system_std_dev: item.time_in_system_std,
            time_in_system_min: item.time_in_system_min,
            time_in_system_max: item.time_in_system_max,

            // Time waiting statistics
            time_waiting_mean: item.time_waiting_mean,
            time_waiting_std_dev: item.time_waiting_std,
            time_waiting_min: item.time_waiting_min,
            time_waiting_max: item.time_waiting_max,

            // Time blocked statistics
            time_blocked_mean: item.time_blocked_mean,
            time_blocked_std_dev: item.time_blocked_std,
            time_blocked_min: item.time_blocked_min,
            time_blocked_max: item.time_blocked_max,

            // Time in operation statistics
            time_in_operation_mean: item.time_in_operation_mean,
            time_in_operation_std_dev: item.time_in_operation_std,
            time_in_operation_min: item.time_in_operation_min,
            time_in_operation_max: item.time_in_operation_max,

            // Time connecting statistics
            time_connecting_mean: item.time_connecting_mean,
            time_connecting_std_dev: item.time_connecting_std,
            time_connecting_min: item.time_connecting_min,
            time_connecting_max: item.time_connecting_max,

            // Percentage metrics
            percent_waiting_mean: item.percent_waiting_mean,
            percent_waiting_std_dev: item.percent_waiting_std,
            percent_waiting_min: item.percent_waiting_min,
            percent_waiting_max: item.percent_waiting_max,

            percent_blocked_mean: item.percent_blocked_mean,
            percent_blocked_std_dev: item.percent_blocked_std,
            percent_blocked_min: item.percent_blocked_min,
            percent_blocked_max: item.percent_blocked_max,

            percent_operation_mean: item.percent_operation_mean,
            percent_operation_std_dev: item.percent_operation_std,
            percent_operation_min: item.percent_operation_min,
            percent_operation_max: item.percent_operation_max,

            percent_connecting_mean: item.percent_connecting_mean,
            percent_connecting_std_dev: item.percent_connecting_std,
            percent_connecting_min: item.percent_connecting_min,
            percent_connecting_max: item.percent_connecting_max,

            // WIP statistics
            trough_wip_mean: item.trough_wip_mean,
            trough_wip_std_dev: item.trough_wip_std,
            trough_wip_min: item.trough_wip_min,
            trough_wip_max: item.trough_wip_max,

            peak_wip_mean: item.peak_wip_mean,
            peak_wip_std_dev: item.peak_wip_std,
            peak_wip_min: item.peak_wip_min,
            peak_wip_max: item.peak_wip_max,

            avg_wip_mean: item.avg_wip_mean,
            avg_wip_std_dev: item.avg_wip_std,
            avg_wip_min: item.avg_wip_min,
            avg_wip_max: item.avg_wip_max,

            // Replication count
            num_replications: item.num_replications
        }));

        conditionalLog(`[entityCrossRep] Mapped ${mappedResult.length} records`);

        // Validate and provide defaults for any missing fields
        const validatedResult = mappedResult.map(item => {
            const validItem: EntityCrossRepSummaryData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || "Unknown"),
                scenario_name: String(item.scenario_name || "Unknown"),
                entity_id: String(item.entity_id || "Unknown"),
                entity_name: String(item.entity_name || "Unknown"),

                // Created statistics
                created_mean: item.created_mean ?? 0,
                created_std_dev: item.created_std_dev ?? 0,
                created_min: item.created_min ?? 0,
                created_max: item.created_max ?? 0,

                // Completed count statistics
                completed_count_mean: item.completed_count_mean ?? 0,
                completed_count_std_dev: item.completed_count_std_dev ?? 0,
                completed_count_min: item.completed_count_min ?? 0,
                completed_count_max: item.completed_count_max ?? 0,

                // In progress count statistics
                in_progress_count_mean: item.in_progress_count_mean ?? 0,
                in_progress_count_std_dev: item.in_progress_count_std_dev ?? 0,
                in_progress_count_min: item.in_progress_count_min ?? 0,
                in_progress_count_max: item.in_progress_count_max ?? 0,

                // Interval statistics
                interval_mean: item.interval_mean ?? 0,
                interval_std_dev: item.interval_std_dev ?? 0,
                interval_min: item.interval_min ?? 0,
                interval_max: item.interval_max ?? 0,

                // Throughput rate statistics
                throughput_rate_mean: item.throughput_rate_mean ?? 0,
                throughput_rate_std_dev: item.throughput_rate_std_dev ?? 0,
                throughput_rate_min: item.throughput_rate_min ?? 0,
                throughput_rate_max: item.throughput_rate_max ?? 0,

                // Overall interval statistics
                overall_interval_mean: item.overall_interval_mean ?? 0,
                overall_interval_std_dev: item.overall_interval_std_dev ?? 0,
                overall_interval_min: item.overall_interval_min ?? 0,
                overall_interval_max: item.overall_interval_max ?? 0,

                // Time in system statistics
                time_in_system_mean: item.time_in_system_mean ?? 0,
                time_in_system_std_dev: item.time_in_system_std_dev ?? 0,
                time_in_system_min: item.time_in_system_min ?? 0,
                time_in_system_max: item.time_in_system_max ?? 0,

                // Time waiting statistics
                time_waiting_mean: item.time_waiting_mean ?? 0,
                time_waiting_std_dev: item.time_waiting_std_dev ?? 0,
                time_waiting_min: item.time_waiting_min ?? 0,
                time_waiting_max: item.time_waiting_max ?? 0,

                // Time blocked statistics
                time_blocked_mean: item.time_blocked_mean ?? 0,
                time_blocked_std_dev: item.time_blocked_std_dev ?? 0,
                time_blocked_min: item.time_blocked_min ?? 0,
                time_blocked_max: item.time_blocked_max ?? 0,

                // Time in operation statistics
                time_in_operation_mean: item.time_in_operation_mean ?? 0,
                time_in_operation_std_dev: item.time_in_operation_std_dev ?? 0,
                time_in_operation_min: item.time_in_operation_min ?? 0,
                time_in_operation_max: item.time_in_operation_max ?? 0,

                // Time connecting statistics
                time_connecting_mean: item.time_connecting_mean ?? 0,
                time_connecting_std_dev: item.time_connecting_std_dev ?? 0,
                time_connecting_min: item.time_connecting_min ?? 0,
                time_connecting_max: item.time_connecting_max ?? 0,

                // Percentage metrics
                percent_waiting_mean: item.percent_waiting_mean ?? 0,
                percent_waiting_std_dev: item.percent_waiting_std_dev ?? 0,
                percent_waiting_min: item.percent_waiting_min ?? 0,
                percent_waiting_max: item.percent_waiting_max ?? 0,

                percent_blocked_mean: item.percent_blocked_mean ?? 0,
                percent_blocked_std_dev: item.percent_blocked_std_dev ?? 0,
                percent_blocked_min: item.percent_blocked_min ?? 0,
                percent_blocked_max: item.percent_blocked_max ?? 0,

                percent_operation_mean: item.percent_operation_mean ?? 0,
                percent_operation_std_dev: item.percent_operation_std_dev ?? 0,
                percent_operation_min: item.percent_operation_min ?? 0,
                percent_operation_max: item.percent_operation_max ?? 0,

                percent_connecting_mean: item.percent_connecting_mean ?? 0,
                percent_connecting_std_dev: item.percent_connecting_std_dev ?? 0,
                percent_connecting_min: item.percent_connecting_min ?? 0,
                percent_connecting_max: item.percent_connecting_max ?? 0,

                // WIP statistics
                trough_wip_mean: item.trough_wip_mean ?? 0,
                trough_wip_std_dev: item.trough_wip_std_dev ?? 0,
                trough_wip_min: item.trough_wip_min ?? 0,
                trough_wip_max: item.trough_wip_max ?? 0,

                peak_wip_mean: item.peak_wip_mean ?? 0,
                peak_wip_std_dev: item.peak_wip_std_dev ?? 0,
                peak_wip_min: item.peak_wip_min ?? 0,
                peak_wip_max: item.peak_wip_max ?? 0,

                avg_wip_mean: item.avg_wip_mean ?? 0,
                avg_wip_std_dev: item.avg_wip_std_dev ?? 0,
                avg_wip_min: item.avg_wip_min ?? 0,
                avg_wip_max: item.avg_wip_max ?? 0,

                // Replication count
                num_replications: item.num_replications ?? 0
            };

            return validItem;
        });

        conditionalLog(`[entityCrossRep] Validated ${validatedResult.length} entity cross-rep records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[entityCrossRep] Error fetching entity cross-rep data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares entity cross-replication summary data for Lucid update
 * @param data Array of entity cross-replication summary data
 * @returns Collection update for Lucid
 */
export function prepareEntityCrossRepUpdate(data: EntityCrossRepSummaryData[]) {
    conditionalLog("[entityCrossRep] Starting entity cross-rep update preparation");
    conditionalLog(`[entityCrossRep] Processing ${data.length} rows of entity cross-rep data`);

    const items = new Map<string, SerializedFields>();

    data.forEach(item => {
        conditionalLog(`[entityCrossRep] Processing item with entity_id ${item.entity_id}`);

        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || "Unknown"),
            scenario_name: String(item.scenario_name || "Unknown"),
            entity_id: String(item.entity_id || "Unknown"),
            entity_name: String(item.entity_name || "Unknown"),

            // Created statistics
            created_mean: item.created_mean ?? 0,
            created_std_dev: item.created_std_dev ?? 0,
            created_min: item.created_min ?? 0,
            created_max: item.created_max ?? 0,

            // Completed count statistics
            completed_count_mean: item.completed_count_mean ?? 0,
            completed_count_std_dev: item.completed_count_std_dev ?? 0,
            completed_count_min: item.completed_count_min ?? 0,
            completed_count_max: item.completed_count_max ?? 0,

            // In progress count statistics
            in_progress_count_mean: item.in_progress_count_mean ?? 0,
            in_progress_count_std_dev: item.in_progress_count_std_dev ?? 0,
            in_progress_count_min: item.in_progress_count_min ?? 0,
            in_progress_count_max: item.in_progress_count_max ?? 0,

            // Interval statistics
            interval_mean: item.interval_mean ?? 0,
            interval_std_dev: item.interval_std_dev ?? 0,
            interval_min: item.interval_min ?? 0,
            interval_max: item.interval_max ?? 0,

            // Throughput rate statistics
            throughput_rate_mean: item.throughput_rate_mean ?? 0,
            throughput_rate_std_dev: item.throughput_rate_std_dev ?? 0,
            throughput_rate_min: item.throughput_rate_min ?? 0,
            throughput_rate_max: item.throughput_rate_max ?? 0,

            // Overall interval statistics
            overall_interval_mean: item.overall_interval_mean ?? 0,
            overall_interval_std_dev: item.overall_interval_std_dev ?? 0,
            overall_interval_min: item.overall_interval_min ?? 0,
            overall_interval_max: item.overall_interval_max ?? 0,

            // Time in system statistics
            time_in_system_mean: item.time_in_system_mean ?? 0,
            time_in_system_std_dev: item.time_in_system_std_dev ?? 0,
            time_in_system_min: item.time_in_system_min ?? 0,
            time_in_system_max: item.time_in_system_max ?? 0,

            // Time waiting statistics
            time_waiting_mean: item.time_waiting_mean ?? 0,
            time_waiting_std_dev: item.time_waiting_std_dev ?? 0,
            time_waiting_min: item.time_waiting_min ?? 0,
            time_waiting_max: item.time_waiting_max ?? 0,

            // Time blocked statistics
            time_blocked_mean: item.time_blocked_mean ?? 0,
            time_blocked_std_dev: item.time_blocked_std_dev ?? 0,
            time_blocked_min: item.time_blocked_min ?? 0,
            time_blocked_max: item.time_blocked_max ?? 0,

            // Time in operation statistics
            time_in_operation_mean: item.time_in_operation_mean ?? 0,
            time_in_operation_std_dev: item.time_in_operation_std_dev ?? 0,
            time_in_operation_min: item.time_in_operation_min ?? 0,
            time_in_operation_max: item.time_in_operation_max ?? 0,

            // Time connecting statistics
            time_connecting_mean: item.time_connecting_mean ?? 0,
            time_connecting_std_dev: item.time_connecting_std_dev ?? 0,
            time_connecting_min: item.time_connecting_min ?? 0,
            time_connecting_max: item.time_connecting_max ?? 0,

            // Percentage metrics
            percent_waiting_mean: item.percent_waiting_mean ?? 0,
            percent_waiting_std_dev: item.percent_waiting_std_dev ?? 0,
            percent_waiting_min: item.percent_waiting_min ?? 0,
            percent_waiting_max: item.percent_waiting_max ?? 0,

            percent_blocked_mean: item.percent_blocked_mean ?? 0,
            percent_blocked_std_dev: item.percent_blocked_std_dev ?? 0,
            percent_blocked_min: item.percent_blocked_min ?? 0,
            percent_blocked_max: item.percent_blocked_max ?? 0,

            percent_operation_mean: item.percent_operation_mean ?? 0,
            percent_operation_std_dev: item.percent_operation_std_dev ?? 0,
            percent_operation_min: item.percent_operation_min ?? 0,
            percent_operation_max: item.percent_operation_max ?? 0,

            percent_connecting_mean: item.percent_connecting_mean ?? 0,
            percent_connecting_std_dev: item.percent_connecting_std_dev ?? 0,
            percent_connecting_min: item.percent_connecting_min ?? 0,
            percent_connecting_max: item.percent_connecting_max ?? 0,

            // WIP statistics
            trough_wip_mean: item.trough_wip_mean ?? 0,
            trough_wip_std_dev: item.trough_wip_std_dev ?? 0,
            trough_wip_min: item.trough_wip_min ?? 0,
            trough_wip_max: item.trough_wip_max ?? 0,

            peak_wip_mean: item.peak_wip_mean ?? 0,
            peak_wip_std_dev: item.peak_wip_std_dev ?? 0,
            peak_wip_min: item.peak_wip_min ?? 0,
            peak_wip_max: item.peak_wip_max ?? 0,

            avg_wip_mean: item.avg_wip_mean ?? 0,
            avg_wip_std_dev: item.avg_wip_std_dev ?? 0,
            avg_wip_min: item.avg_wip_min ?? 0,
            avg_wip_max: item.avg_wip_max ?? 0,

            // Replication count
            num_replications: item.num_replications ?? 0
        };

        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[entityCrossRep] Final map has ${items.size} items`);

    return {
        schema: EntityCrossRepSchema,
        patch: {
            items
        }
    };
}
