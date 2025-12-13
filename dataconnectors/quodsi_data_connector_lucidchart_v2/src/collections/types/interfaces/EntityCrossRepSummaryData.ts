/**
 * Interface for Entity Cross-Replication Summary data
 * Defines entity metrics aggregated across replications
 * Merges EntityThroughputCrossRepSummaryData and EntityStateCrossRepSummaryData
 * Matches the Python EntityCrossRepSummarySchema format
 */
export interface EntityCrossRepSummaryData {
    // Identifiers
    id: string;
    scenario_id: string;
    scenario_name: string;
    entity_id: string;
    entity_name: string;

    // Created statistics (entities created)
    created_mean: number;
    created_median: number;
    created_std_dev: number;

    // Completed count statistics
    completed_count_mean: number;
    completed_count_median: number;
    completed_count_std_dev: number;

    // In progress count statistics
    in_progress_count_mean: number;
    in_progress_count_median: number;
    in_progress_count_std_dev: number;

    // Throughput rate statistics
    throughput_rate_mean: number;
    throughput_rate_median: number;
    throughput_rate_std_dev: number;
    throughput_rate_cv: number;  // Coefficient of variation

    // Interval statistics
    interval_mean: number;
    interval_median: number;
    interval_std_dev: number;
    interval_cv: number;  // Coefficient of variation
    
    // Overall interval statistics
    overall_interval_mean: number;
    overall_interval_median: number;
    overall_interval_std_dev: number;
    overall_interval_cv: number;  // Coefficient of variation

    // First exit statistics
    first_exit_mean: number | null;
    first_exit_median: number | null;
    first_exit_std_dev: number | null;

    // Last exit statistics
    last_exit_mean: number | null;
    last_exit_median: number | null;
    last_exit_std_dev: number | null;

    // Time in system statistics
    time_in_system_mean: number;
    time_in_system_median: number;
    time_in_system_std_dev: number;

    // Time waiting statistics
    time_waiting_mean: number;
    time_waiting_median: number;
    time_waiting_std_dev: number;

    // Time blocked statistics
    time_blocked_mean: number;
    time_blocked_median: number;
    time_blocked_std_dev: number;

    // Time in operation statistics
    time_in_operation_mean: number;
    time_in_operation_median: number;
    time_in_operation_std_dev: number;

    // Time connecting statistics
    time_connecting_mean: number;
    time_connecting_median: number;
    time_connecting_std_dev: number;

    // Percentage metrics
    percent_waiting_mean: number;
    percent_waiting_std_dev: number;
    percent_blocked_mean: number;
    percent_blocked_std_dev: number;
    percent_operation_mean: number;
    percent_operation_std_dev: number;
    percent_connecting_mean: number;
    percent_connecting_std_dev: number;
}