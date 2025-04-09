/**
 * Interface for Entity State Cross Replication Summary data
 * Defines entity state metrics across simulation replications
 */
export interface EntityStateCrossRepSummaryData {
    id: string;
    scenario_id: string;
    scenario_name: string;
    entity_id: string;
    entity_name: string;
    count_mean: number;
    count_median: number;
    count_std_dev: number;
    time_in_system_mean: number;
    time_in_system_median: number;
    time_in_system_std_dev: number;
    time_waiting_mean: number;
    time_waiting_median: number;
    time_waiting_std_dev: number;
    time_blocked_mean: number;
    time_blocked_median: number;
    time_blocked_std_dev: number;
    time_in_operation_mean: number;
    time_in_operation_median: number;
    time_in_operation_std_dev: number;
    time_connecting_mean: number;
    time_connecting_median: number;
    time_connecting_std_dev: number;
    percent_waiting_mean: number;
    percent_waiting_std_dev: number;
    percent_blocked_mean: number;
    percent_blocked_std_dev: number;
    percent_operation_mean: number;
    percent_operation_std_dev: number;
    percent_connecting_mean: number;
    percent_connecting_std_dev: number;

    // Allow for additional properties
    [key: string]: any;
}
