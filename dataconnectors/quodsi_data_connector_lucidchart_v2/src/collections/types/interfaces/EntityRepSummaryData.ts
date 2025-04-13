/**
 * Interface for Entity Replication Summary data
 * Defines entity metrics for a specific entity type in a replication
 * Merges EntityThroughputRepSummaryData and EntityStateRepSummaryData
 * Matches the Python EntityRepSummarySchema format
 */
export interface EntityRepSummaryData {
    // Identifiers
    id: string;
    scenario_id: string;
    scenario_name: string;
    entity_id: string;
    entity_name: string;
    rep: number;  // Replication number

    // Core metrics
    entity_count: number;  // Total entity count
    completed_count: number;  // Number of entities that completed processing
    in_progress_count: number;  // Number of entities still in the system
    throughput_rate: number;  // Entities per time unit

    // Exit time metrics
    first_exit: number | null;  // Time of first entity exit
    last_exit: number | null;  // Time of last entity exit

    // Interval metrics
    avg_interval: number | null;  // Average time between entity exits
    min_interval: number | null;  // Minimum time between entity exits
    max_interval: number | null;  // Maximum time between entity exits

    // Time metrics
    avg_time_in_system: number;  // Average total time in system
    avg_time_waiting: number;  // Average time spent waiting
    avg_time_blocked: number;  // Average time spent blocked
    avg_time_in_operation: number;  // Average time in operation
    avg_time_connecting: number;  // Average time in connectors

    // Percentage metrics
    percent_waiting: number;  // Percent of time spent waiting
    percent_blocked: number;  // Percent of time spent blocked
    percent_operation: number;  // Percent of time in operation
    percent_connecting: number;  // Percent of time in connectors
}