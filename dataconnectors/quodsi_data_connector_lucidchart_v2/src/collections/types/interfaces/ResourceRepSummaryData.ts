/**
 * Interface for Resource Replication Summary data
 * Defines resource utilization and capacity metrics
 */
export interface ResourceRepSummaryData {
    id: string;
    scenario_id: string;
    scenario_name: string;
    resource_id: string;
    resource_name: string;
    rep: number;
    total_requests: number;
    total_captures: number;
    total_releases: number;
    avg_capture_time: number;
    utilization_rate: number;
    total_time_waiting: number;
    avg_queue_time: number;
    max_queue_length: number;
    avg_contents: number;
}
