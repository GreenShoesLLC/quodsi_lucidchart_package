/**
 * Interface for Entity State Replication Summary data
 * Defines entity state metrics across simulation replications
 */
export interface EntityStateRepSummaryData {
    id?: string; // Optional since we'll generate it when processing the data
    rep: number;
    entity_type: string;
    count: number;
    avg_time_in_system: number;
    avg_time_waiting: number;
    avg_time_blocked: number;
    avg_time_in_operation: number;
    avg_time_connecting: number;
    percent_waiting: number;
    percent_blocked: number;
    percent_operation: number;
    percent_connecting: number;
}
