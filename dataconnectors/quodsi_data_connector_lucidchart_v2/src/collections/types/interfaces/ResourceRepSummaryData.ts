/**
 * Interface for Resource Replication Summary data
 * Defines resource utilization and capacity metrics
 * Matches the Python ResourceRepCsvDto format
 */
export interface ResourceRepSummaryData {
    id: string;
    scenario_id: string;
    scenario_name: string;
    resource_id: string;
    resource_name: string;
    rep: number;
    // Capacity metrics
    capacity: number;
    total_available_clock: number;
    // Usage metrics
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    times_acquired: number;
    times_released: number;
    // Time metrics
    total_time_in_use: number;
    total_time_idle: number;
    total_blocking_time: number;
    // Utilization metrics
    average_utilization: number;
    peak_utilization: number;
    current_utilization: number;
    // Performance metrics
    average_wait_time: number;
    max_wait_time: number;
    average_queue_length: number;
    max_queue_length: number;
    // Conflict metrics
    total_conflicts: number;
    conflict_frequency: number;
}
