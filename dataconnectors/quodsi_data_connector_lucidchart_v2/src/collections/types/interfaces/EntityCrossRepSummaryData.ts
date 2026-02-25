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
    time_resource_wait_mean: number;
    time_resource_wait_std_dev: number;
    time_resource_wait_min: number;
    time_resource_wait_max: number;

    // Time blocked statistics
    time_queue_wait_mean: number;
    time_queue_wait_std_dev: number;
    time_queue_wait_min: number;
    time_queue_wait_max: number;

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
    percent_resource_wait_mean: number;
    percent_resource_wait_std_dev: number;
    percent_resource_wait_min: number;
    percent_resource_wait_max: number;

    percent_queue_wait_mean: number;
    percent_queue_wait_std_dev: number;
    percent_queue_wait_min: number;
    percent_queue_wait_max: number;

    percent_operation_mean: number;
    percent_operation_std_dev: number;
    percent_operation_min: number;
    percent_operation_max: number;

    percent_connecting_mean: number;
    percent_connecting_std_dev: number;
    percent_connecting_min: number;
    percent_connecting_max: number;

    // WIP (Work In Progress) statistics
    trough_wip_mean: number;
    trough_wip_std_dev: number;
    trough_wip_min: number;
    trough_wip_max: number;

    peak_wip_mean: number;
    peak_wip_std_dev: number;
    peak_wip_min: number;
    peak_wip_max: number;

    avg_wip_mean: number;
    avg_wip_std_dev: number;
    avg_wip_min: number;
    avg_wip_max: number;

    // Replication count
    num_replications: number;
}
