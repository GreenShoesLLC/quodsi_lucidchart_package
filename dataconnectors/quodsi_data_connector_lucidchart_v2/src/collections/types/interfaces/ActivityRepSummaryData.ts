/**
 * Interface for Activity Replication Summary data
 * Defines summarized metrics for activities across simulation replications
 */
export interface ActivityRepSummaryData {
    id: string;
    scenario_id: string;
    scenario_name: string;
    activity_id: string;
    activity_name: string;
    rep: number;
    capacity: number;
    total_available_clock: number;
    total_arrivals: number;
    total_requests: number;
    total_captures: number;
    total_releases: number;
    total_time_in_capture: number;
    total_time_blocked: number;
    total_time_waiting: number;
    average_contents: number;
    maximum_contents: number;
    current_contents: number;
    capacity_utilization: number;
    active_time_pct: number;
    average_time_per_entry: number;
    inbound_queue_utilization: number;
    outbound_queue_utilization: number;
    inbound_queue_queue_time: number;
    outbound_queue_queue_time: number;
    total_time_blocked_upstream: number;
    total_time_blocked_downstream: number;
    blocking_frequency: number;
    resource_starvation_time: number;
    resource_conflict_count: number;
}
