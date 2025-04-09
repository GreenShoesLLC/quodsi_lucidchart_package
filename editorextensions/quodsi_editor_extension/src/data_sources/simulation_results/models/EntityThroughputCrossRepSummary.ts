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
    throughput_rate_cv: string;
    interval_mean: number;
    interval_median: number;
    interval_std_dev: number;
    interval_cv: string;
    first_exit_mean: string;
    first_exit_median: string;
    first_exit_std_dev: string;
    last_exit_mean: string;
    last_exit_median: string;
    last_exit_std_dev: string;
}

// Create a mapping function for converting raw data to typed objects
export function mapToEntityThroughputCrossRepSummary(fields: any): EntityThroughputCrossRepSummary {
    console.log('[DEBUG] mapToEntityThroughputCrossRepSummary raw fields:', fields);
    console.log('[DEBUG] mapToEntityThroughputCrossRepSummary entity_name:', fields.entity_name);
    console.log('[DEBUG] mapToEntityThroughputCrossRepSummary scenario_name:', fields.scenario_name);
    
    return {
        id: String(fields.id || ''),
        scenario_id: String(fields.scenario_id || ''),
        scenario_name: String(fields.scenario_name || ''),
        entity_id: String(fields.entity_id || ''),
        entity_name: String(fields.entity_name || ''),
        count_mean: Number(fields.count_mean || 0),
        count_median: Number(fields.count_median || 0),
        count_std_dev: Number(fields.count_std_dev || 0),
        completed_count_mean: Number(fields.completed_count_mean || 0),
        completed_count_median: Number(fields.completed_count_median || 0),
        completed_count_std_dev: Number(fields.completed_count_std_dev || 0),
        in_progress_count_mean: Number(fields.in_progress_count_mean || 0),
        in_progress_count_median: Number(fields.in_progress_count_median || 0),
        in_progress_count_std_dev: Number(fields.in_progress_count_std_dev || 0),
        throughput_rate_mean: Number(fields.throughput_rate_mean || 0),
        throughput_rate_median: Number(fields.throughput_rate_median || 0),
        throughput_rate_std_dev: Number(fields.throughput_rate_std_dev || 0),
        throughput_rate_cv: String(fields.throughput_rate_cv || ''),
        interval_mean: Number(fields.interval_mean || 0),
        interval_median: Number(fields.interval_median || 0),
        interval_std_dev: Number(fields.interval_std_dev || 0),
        interval_cv: String(fields.interval_cv || ''),
        first_exit_mean: String(fields.first_exit_mean || ''),
        first_exit_median: String(fields.first_exit_median || ''),
        first_exit_std_dev: String(fields.first_exit_std_dev || ''),
        last_exit_mean: String(fields.last_exit_mean || ''),
        last_exit_median: String(fields.last_exit_median || ''),
        last_exit_std_dev: String(fields.last_exit_std_dev || '')
    };
}
