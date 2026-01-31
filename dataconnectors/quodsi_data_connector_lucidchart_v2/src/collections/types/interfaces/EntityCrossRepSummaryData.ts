/**
 * Interface for Entity Cross-Replication Summary data
 * Defines entity metrics aggregated across replications
 * Matches the Python entity_summary_summary.csv format
 */
export interface EntityCrossRepSummaryData {
    // Identifiers
    id: string;
    scenario_id: string;
    scenario_name: string;
    entity_id: string;
    entity_name: string;

    // Created statistics (total_created in CSV)
    created_mean: number;
    created_std_dev: number;
    created_min: number;
    created_max: number;

    // Completed count statistics
    completed_count_mean: number;
    completed_count_std_dev: number;
    completed_count_min: number;
    completed_count_max: number;

    // In progress count statistics
    in_progress_count_mean: number;
    in_progress_count_std_dev: number;
    in_progress_count_min: number;
    in_progress_count_max: number;

    // Interval statistics
    interval_mean: number;
    interval_std_dev: number;
    interval_min: number;
    interval_max: number;

    // Throughput rate statistics
    throughput_rate_mean: number;
    throughput_rate_std_dev: number;
    throughput_rate_min: number;
    throughput_rate_max: number;

    // Overall interval statistics
    overall_interval_mean: number;
    overall_interval_std_dev: number;
    overall_interval_min: number;
    overall_interval_max: number;

    // Time in system statistics
    time_in_system_mean: number;
    time_in_system_std_dev: number;
    time_in_system_min: number;
    time_in_system_max: number;

    // Time waiting statistics
    time_waiting_mean: number;
    time_waiting_std_dev: number;
    time_waiting_min: number;
    time_waiting_max: number;

    // Time blocked statistics
    time_blocked_mean: number;
    time_blocked_std_dev: number;
    time_blocked_min: number;
    time_blocked_max: number;

    // Time in operation statistics
    time_in_operation_mean: number;
    time_in_operation_std_dev: number;
    time_in_operation_min: number;
    time_in_operation_max: number;

    // Time connecting statistics
    time_connecting_mean: number;
    time_connecting_std_dev: number;
    time_connecting_min: number;
    time_connecting_max: number;

    // Percentage metrics
    percent_waiting_mean: number;
    percent_waiting_std_dev: number;
    percent_waiting_min: number;
    percent_waiting_max: number;

    percent_blocked_mean: number;
    percent_blocked_std_dev: number;
    percent_blocked_min: number;
    percent_blocked_max: number;

    percent_operation_mean: number;
    percent_operation_std_dev: number;
    percent_operation_min: number;
    percent_operation_max: number;

    percent_connecting_mean: number;
    percent_connecting_std_dev: number;
    percent_connecting_min: number;
    percent_connecting_max: number;

    // WIP (Work In Progress) statistics
    min_wip_mean: number;
    min_wip_std_dev: number;
    min_wip_min: number;
    min_wip_max: number;

    max_wip_mean: number;
    max_wip_std_dev: number;
    max_wip_min: number;
    max_wip_max: number;

    avg_wip_mean: number;
    avg_wip_std_dev: number;
    avg_wip_min: number;
    avg_wip_max: number;

    // Replication count
    num_replications: number;
}
