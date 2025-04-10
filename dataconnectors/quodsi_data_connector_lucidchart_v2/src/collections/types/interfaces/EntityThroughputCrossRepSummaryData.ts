/**
 * Interface for Entity Throughput Cross Replication Summary data
 * Defines entity throughput metrics across simulation replications
 */
export interface EntityThroughputCrossRepSummaryData {
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
    
    // Allow for additional properties
    [key: string]: any;
}
