import { MapProxy } from 'lucid-extension-sdk';

// Define the interface for the entity throughput cross rep summary data
export interface EntityThroughputCrossRepSummary {
    id: string;
    scenario_id: string;
    scenario_name: string;
    entity_id: string;
    entity_name: string;
    count_mean: number;
    count_median: number;
    count_std_dev: number;
    completed_count_mean: number;
    completed_count_median: number;
    completed_count_std_dev: number;
    in_progress_count_mean: number;
    in_progress_count_median: number;
    in_progress_count_std_dev: number;
    throughput_rate_mean: number;
    throughput_rate_median: number;
    throughput_rate_std_dev: number;
    throughput_rate_cv: number;
    interval_mean: number;
    interval_median: number;
    interval_std_dev: number;
    interval_cv: number;
    first_exit_mean: number;
    first_exit_median: number;
    first_exit_std_dev: number;
    last_exit_mean: number;
    last_exit_median: number;
    last_exit_std_dev: number;
}

/**
 * Converts raw collection item data to a strongly typed EntityThroughputCrossRepSummary object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed EntityThroughputCrossRepSummary object
 */
export function mapToEntityThroughputCrossRepSummary(itemFields: MapProxy<string, any>): EntityThroughputCrossRepSummary {
    console.log('[DEBUG] mapToEntityThroughputCrossRepSummary - Starting mapping');
    
    // Check if itemFields is empty or has only method properties
    try {
        let hasDataKeys = false;
        for (const [key, _] of itemFields) {
            if (key !== 'getKeys' && key !== 'getItem' && key !== 'size') {
                hasDataKeys = true;
                break;
            }
        }
        
        if (!hasDataKeys) {
            console.log('[DEBUG] mapToEntityThroughputCrossRepSummary - Empty or method-only MapProxy');
            // Return default values
            return {
                id: '',
                scenario_id: '',
                scenario_name: 'New Scenario',
                entity_id: '',
                entity_name: 'Entity',
                count_mean: 0,
                count_median: 0,
                count_std_dev: 0,
                completed_count_mean: 0,
                completed_count_median: 0,
                completed_count_std_dev: 0,
                in_progress_count_mean: 0,
                in_progress_count_median: 0,
                in_progress_count_std_dev: 0,
                throughput_rate_mean: 0,
                throughput_rate_median: 0,
                throughput_rate_std_dev: 0,
                throughput_rate_cv: 0,
                interval_mean: 0,
                interval_median: 0,
                interval_std_dev: 0,
                interval_cv: 0,
                first_exit_mean: 0,
                first_exit_median: 0,
                first_exit_std_dev: 0,
                last_exit_mean: 0,
                last_exit_median: 0,
                last_exit_std_dev: 0
            };
        }
    } catch (error) {
        console.log('[DEBUG] Error checking MapProxy keys:', error);
    }
    
    // Log field access for debugging
    console.log('[DEBUG] mapToEntityThroughputCrossRepSummary entity_name:', itemFields.get('entity_name'));
    console.log('[DEBUG] mapToEntityThroughputCrossRepSummary scenario_name:', itemFields.get('scenario_name'));
    
    return {
        id: String(itemFields.get('id') || ''),
        scenario_id: String(itemFields.get('scenario_id') || ''),
        scenario_name: String(itemFields.get('scenario_name') || ''),
        entity_id: String(itemFields.get('entity_id') || ''),
        entity_name: String(itemFields.get('entity_name') || ''),
        count_mean: Number(itemFields.get('count_mean') || 0),
        count_median: Number(itemFields.get('count_median') || 0),
        count_std_dev: Number(itemFields.get('count_std_dev') || 0),
        completed_count_mean: Number(itemFields.get('completed_count_mean') || 0),
        completed_count_median: Number(itemFields.get('completed_count_median') || 0),
        completed_count_std_dev: Number(itemFields.get('completed_count_std_dev') || 0),
        in_progress_count_mean: Number(itemFields.get('in_progress_count_mean') || 0),
        in_progress_count_median: Number(itemFields.get('in_progress_count_median') || 0),
        in_progress_count_std_dev: Number(itemFields.get('in_progress_count_std_dev') || 0),
        throughput_rate_mean: Number(itemFields.get('throughput_rate_mean') || 0),
        throughput_rate_median: Number(itemFields.get('throughput_rate_median') || 0),
        throughput_rate_std_dev: Number(itemFields.get('throughput_rate_std_dev') || 0),
        throughput_rate_cv: Number(itemFields.get('throughput_rate_cv') || 0),
        interval_mean: Number(itemFields.get('interval_mean') || 0),
        interval_median: Number(itemFields.get('interval_median') || 0),
        interval_std_dev: Number(itemFields.get('interval_std_dev') || 0),
        interval_cv: Number(itemFields.get('interval_cv') || 0),
        first_exit_mean: Number(itemFields.get('first_exit_mean') || 0),
        first_exit_median: Number(itemFields.get('first_exit_median') || 0),
        first_exit_std_dev: Number(itemFields.get('first_exit_std_dev') || 0),
        last_exit_mean: Number(itemFields.get('last_exit_mean') || 0),
        last_exit_median: Number(itemFields.get('last_exit_median') || 0),
        last_exit_std_dev: Number(itemFields.get('last_exit_std_dev') || 0)
    };
}
