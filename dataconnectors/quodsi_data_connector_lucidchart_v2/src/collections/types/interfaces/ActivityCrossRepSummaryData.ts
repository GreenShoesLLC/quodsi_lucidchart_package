/**
 * Interface for Activity Cross-Replication Summary data
 * Defines activity metrics aggregated across replications
 * Merges ActivityUtilizationData and ActivityTimingData
 * Matches the Python ActivityCrossRepSummarySchema format
 */
export interface ActivityCrossRepSummaryData {
    // Identifiers
    id: string;
    scenario_id: string;
    scenario_name: string;
    activity_id: string;
    activity_name: string;

    // Utilization metrics
    utilization_mean: number;  // Mean utilization
    utilization_max: number;   // Maximum utilization
    utilization_std_dev: number;  // Utilization standard deviation

    // Capacity metrics
    capacity_mean: number;  // Mean capacity
    capacity_max: number;   // Maximum capacity
    capacity_std_dev: number;  // Capacity standard deviation

    // Avg Number Allocated metrics (formerly contents)
    avg_number_allocated_mean: number;  // Mean average number allocated
    avg_number_allocated_max: number;   // Maximum average number allocated
    avg_number_allocated_std_dev: number;  // Avg number allocated standard deviation

    // Cycle time metrics
    cycle_time_mean: number;  // Mean cycle time
    cycle_time_median: number;  // Median cycle time
    cycle_time_std_dev: number;  // Cycle time standard deviation
    cycle_time_cv: number;  // Cycle time coefficient of variation

    // Total Time Waiting for Resource metrics (formerly waiting time)
    total_time_waiting_for_resource_mean: number;  // Mean total time waiting for resource
    total_time_waiting_for_resource_median: number;  // Median total time waiting for resource
    total_time_waiting_for_resource_std_dev: number;  // Total time waiting for resource standard deviation
    total_time_waiting_for_resource_cv: number;  // Total time waiting for resource coefficient of variation

    // Total Time Blocked metrics (formerly blocked time)
    total_time_blocked_mean: number;  // Mean total time blocked
    total_time_blocked_median: number;  // Median total time blocked
    total_time_blocked_std_dev: number;  // Total time blocked standard deviation
    total_time_blocked_cv: number;  // Total time blocked coefficient of variation

    // Flow statistics
    total_arrivals_mean: number;  // Mean total arrivals
    total_arrivals_max: number;   // Maximum total arrivals
    total_arrivals_std_dev: number;  // Total arrivals standard deviation

    total_allocations_mean: number;  // Mean total allocations (formerly captures)
    total_allocations_max: number;   // Maximum total allocations
    total_allocations_std_dev: number;  // Total allocations standard deviation

    throughput_mean: number;  // Mean throughput (formerly releases)
    throughput_max: number;   // Maximum throughput
    throughput_std_dev: number;  // Throughput standard deviation
}