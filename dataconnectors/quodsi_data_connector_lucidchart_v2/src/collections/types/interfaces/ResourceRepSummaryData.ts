/**
 * Interface for Resource Replication Summary data
 * Defines resource utilization and capacity metrics
 */
export interface ResourceRepSummaryData {
    id?: string; // Optional since we'll generate it as a composite key
    rep: number;
    resource_id: string;
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
