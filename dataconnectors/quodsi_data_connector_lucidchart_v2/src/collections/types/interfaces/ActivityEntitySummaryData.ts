/**
 * Activity Entity Summary data interface
 * Represents cross-replication summary data broken down by activity + entity type
 * CSV file: activity_entity_summary_summary.csv (in cross_rep/ folder)
 */
export interface ActivityEntitySummaryData {
    scenario_id: string;
    scenario_name: string;
    activity_id: string;
    activity_name: string;
    entity_type: string;

    // Entity counts
    entity_count_mean: number;
    entity_count_std: number;
    entity_count_min: number;
    entity_count_max: number;
    completed_count_mean: number;
    completed_count_std: number;
    completed_count_min: number;
    completed_count_max: number;

    // Queue contents
    inbound_q_avg_contents_mean: number;
    inbound_q_avg_contents_std: number;
    inbound_q_avg_contents_min: number;
    inbound_q_avg_contents_max: number;
    activity_avg_contents_mean: number;
    activity_avg_contents_std: number;
    activity_avg_contents_min: number;
    activity_avg_contents_max: number;
    outbound_q_avg_contents_mean: number;
    outbound_q_avg_contents_std: number;
    outbound_q_avg_contents_min: number;
    outbound_q_avg_contents_max: number;
    total_avg_contents_mean: number;
    total_avg_contents_std: number;
    total_avg_contents_min: number;
    total_avg_contents_max: number;

    // Time metrics (avg per entity)
    avg_cycle_time_mean: number;
    avg_cycle_time_std: number;
    avg_cycle_time_min: number;
    avg_cycle_time_max: number;
    avg_captured_time_mean: number;
    avg_captured_time_std: number;
    avg_captured_time_min: number;
    avg_captured_time_max: number;
    avg_blocked_time_mean: number;
    avg_blocked_time_std: number;
    avg_blocked_time_min: number;
    avg_blocked_time_max: number;
    avg_failure_time_mean: number;
    avg_failure_time_std: number;
    avg_failure_time_min: number;
    avg_failure_time_max: number;

    // Time metrics (total)
    total_cycle_time_mean: number;
    total_cycle_time_std: number;
    total_cycle_time_min: number;
    total_cycle_time_max: number;
    total_captured_time_mean: number;
    total_captured_time_std: number;
    total_captured_time_min: number;
    total_captured_time_max: number;
    total_blocked_time_mean: number;
    total_blocked_time_std: number;
    total_blocked_time_min: number;
    total_blocked_time_max: number;
    total_failure_time_mean: number;
    total_failure_time_std: number;
    total_failure_time_min: number;
    total_failure_time_max: number;

    // Cost metrics
    fixed_cost_mean: number;
    fixed_cost_std: number;
    fixed_cost_min: number;
    fixed_cost_max: number;
    processing_cost_mean: number;
    processing_cost_std: number;
    processing_cost_min: number;
    processing_cost_max: number;
    operational_cost_mean: number;
    operational_cost_std: number;
    operational_cost_min: number;
    operational_cost_max: number;
    total_cost_mean: number;
    total_cost_std: number;
    total_cost_min: number;
    total_cost_max: number;

    num_replications: number;
}
