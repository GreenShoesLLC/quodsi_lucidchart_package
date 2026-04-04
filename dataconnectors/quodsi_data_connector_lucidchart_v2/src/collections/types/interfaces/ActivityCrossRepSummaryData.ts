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

    // Capacity (single value from CSV)
    capacity: number;
    inbound_queue_capacity: number;
    outbound_queue_capacity: number;

    // Inbound queue avg contents metrics
    inbound_queue_avg_contents_mean: number;
    inbound_queue_avg_contents_std_dev: number;
    inbound_queue_avg_contents_min: number;
    inbound_queue_avg_contents_max: number;

    // Outbound queue avg contents metrics
    outbound_queue_avg_contents_mean: number;
    outbound_queue_avg_contents_std_dev: number;
    outbound_queue_avg_contents_min: number;
    outbound_queue_avg_contents_max: number;

    // Total avg contents metrics
    total_avg_contents_mean: number;
    total_avg_contents_std_dev: number;
    total_avg_contents_min: number;
    total_avg_contents_max: number;

    // Utilization metrics
    capacity_utilization_mean: number;  // Mean utilization
    capacity_utilization_min: number;   // Minimum utilization
    capacity_utilization_max: number;   // Maximum utilization
    capacity_utilization_std_dev: number;  // Utilization standard deviation

    // Active time metrics
    active_time_pct_mean: number;  // Mean active time percentage
    active_time_pct_min: number;   // Minimum active time percentage
    active_time_pct_max: number;   // Maximum active time percentage
    active_time_pct_std_dev: number;  // Active time percentage standard deviation

    // Avg Number Allocated metrics (formerly contents)
    avg_number_allocated_mean: number;  // Mean average number allocated
    avg_number_allocated_min: number;   // Minimum average number allocated
    avg_number_allocated_max: number;   // Maximum average number allocated
    avg_number_allocated_std_dev: number;  // Avg number allocated standard deviation

    // Cycle time metrics
    cycle_time_mean: number;  // Mean cycle time
    cycle_time_min: number;   // Minimum cycle time
    cycle_time_max: number;   // Maximum cycle time
    cycle_time_std_dev: number;  // Cycle time standard deviation

    // Total Time Waiting for Resource metrics (formerly waiting time)
    total_time_waiting_for_resource_mean: number;  // Mean total time waiting for resource
    total_time_waiting_for_resource_min: number;   // Minimum total time waiting for resource
    total_time_waiting_for_resource_max: number;   // Maximum total time waiting for resource
    total_time_waiting_for_resource_std_dev: number;  // Total time waiting for resource standard deviation

    // Total Time Blocked metrics (formerly blocked time)
    total_time_blocked_mean: number;  // Mean total time blocked
    total_time_blocked_min: number;   // Minimum total time blocked
    total_time_blocked_max: number;   // Maximum total time blocked
    total_time_blocked_std_dev: number;  // Total time blocked standard deviation

    // Failure time metrics
    total_time_in_failure_mean: number;  // Mean total time in failure
    total_time_in_failure_min: number;   // Minimum total time in failure
    total_time_in_failure_max: number;   // Maximum total time in failure
    total_time_in_failure_std_dev: number;  // Total time in failure standard deviation

    // Flow statistics
    total_arrivals_mean: number;  // Mean total arrivals
    total_arrivals_min: number;   // Minimum total arrivals
    total_arrivals_max: number;   // Maximum total arrivals
    total_arrivals_std_dev: number;  // Total arrivals standard deviation

    total_allocations_mean: number;  // Mean total allocations (formerly captures)
    total_allocations_min: number;   // Minimum total allocations
    total_allocations_max: number;   // Maximum total allocations
    total_allocations_std_dev: number;  // Total allocations standard deviation

    throughput_mean: number;  // Mean throughput (formerly releases)
    throughput_min: number;   // Minimum throughput
    throughput_max: number;   // Maximum throughput
    throughput_std_dev: number;  // Throughput standard deviation

    // Cost metrics
    fixed_cost_mean: number;  // Mean fixed cost
    fixed_cost_std_dev: number;  // Fixed cost standard deviation
    fixed_cost_min: number;  // Minimum fixed cost
    fixed_cost_max: number;  // Maximum fixed cost

    processing_cost_mean: number;  // Mean processing cost
    processing_cost_std_dev: number;  // Processing cost standard deviation
    processing_cost_min: number;  // Minimum processing cost
    processing_cost_max: number;  // Maximum processing cost

    operational_cost_mean: number;  // Mean operational cost
    operational_cost_std_dev: number;  // Operational cost standard deviation
    operational_cost_min: number;  // Minimum operational cost
    operational_cost_max: number;  // Maximum operational cost

    total_cost_mean: number;  // Mean total cost
    total_cost_std_dev: number;  // Total cost standard deviation
    total_cost_min: number;  // Minimum total cost
    total_cost_max: number;  // Maximum total cost

    // Available time metrics
    available_time_mean: number;  // Mean available time
    available_time_std_dev: number;  // Available time standard deviation
    available_time_min: number;  // Minimum available time
    available_time_max: number;  // Maximum available time

    // Total time used metrics
    total_time_used_mean: number;  // Mean total time used
    total_time_used_std_dev: number;  // Total time used standard deviation
    total_time_used_min: number;  // Minimum total time used
    total_time_used_max: number;  // Maximum total time used

    // Max number allocated metrics
    max_number_allocated_mean: number;  // Mean max number allocated
    max_number_allocated_std_dev: number;  // Max number allocated standard deviation
    max_number_allocated_min: number;  // Minimum max number allocated
    max_number_allocated_max: number;  // Maximum max number allocated

    // Inbound queue stats
    inbound_queue_stats_mean: number;  // Mean inbound queue stats
    inbound_queue_stats_std_dev: number;  // Inbound queue stats standard deviation
    inbound_queue_stats_min: number;  // Minimum inbound queue stats
    inbound_queue_stats_max: number;  // Maximum inbound queue stats

    // Outbound queue stats
    outbound_queue_stats_mean: number;  // Mean outbound queue stats
    outbound_queue_stats_std_dev: number;  // Outbound queue stats standard deviation
    outbound_queue_stats_min: number;  // Minimum outbound queue stats
    outbound_queue_stats_max: number;  // Maximum outbound queue stats

    // Replication count
    num_replications: number;  // Number of replications
}