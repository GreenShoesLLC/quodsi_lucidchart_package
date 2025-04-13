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

    // Contents metrics
    contents_mean: number;  // Mean contents
    contents_max: number;   // Maximum contents
    contents_std_dev: number;  // Contents standard deviation

    // Queue metrics
    queue_length_mean: number;  // Mean queue length
    queue_length_max: number;   // Maximum queue length
    queue_length_std_dev: number;  // Queue length standard deviation

    // Cycle time metrics
    cycle_time_mean: number;  // Mean cycle time
    cycle_time_median: number;  // Median cycle time
    cycle_time_std_dev: number;  // Cycle time standard deviation
    cycle_time_cv: number;  // Cycle time coefficient of variation

    // Waiting time metrics
    waiting_time_mean: number;  // Mean waiting time
    waiting_time_median: number;  // Median waiting time
    waiting_time_std_dev: number;  // Waiting time standard deviation
    waiting_time_cv: number;  // Waiting time coefficient of variation

    // Blocked time metrics
    blocked_time_mean: number;  // Mean blocked time
    blocked_time_median: number;  // Median blocked time
    blocked_time_std_dev: number;  // Blocked time standard deviation
    blocked_time_cv: number;  // Blocked time coefficient of variation

    // Flow statistics
    arrivals_mean: number;  // Mean arrivals
    arrivals_max: number;   // Maximum arrivals
    arrivals_std_dev: number;  // Arrivals standard deviation

    captures_mean: number;  // Mean captures
    captures_max: number;   // Maximum captures
    captures_std_dev: number;  // Captures standard deviation

    releases_mean: number;  // Mean releases
    releases_max: number;   // Maximum releases
    releases_std_dev: number;  // Releases standard deviation
}