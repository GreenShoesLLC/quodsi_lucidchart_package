/**
 * Interface for Entity State Replication Summary data
 * Defines entity state metrics across simulation replications
 */
export interface EntityStateRepSummaryData {
    id: string;
    scenario_id: string;
    scenario_name: string;
    entity_id: string;
    entity_name: string;
    rep: number;
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
