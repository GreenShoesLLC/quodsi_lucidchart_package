// collections/types/interfaces/ScenarioCrossRepSummaryData.ts

/**
 * Scenario cross-replication summary data interface
 * Represents aggregated simulation metrics across replications at the scenario level
 */
export interface ScenarioCrossRepSummaryData {
    // Identifiers
    id: string;
    scenario_id: string;
    scenario_name: string;

    // Total Throughput metrics
    total_throughput_mean: number;
    total_throughput_std_dev: number;
    total_throughput_min: number;
    total_throughput_max: number;

    // Total Entities Created metrics
    total_entities_created_mean: number;
    total_entities_created_std_dev: number;
    total_entities_created_min: number;
    total_entities_created_max: number;

    // Entities In Progress metrics
    entities_in_progress_mean: number;
    entities_in_progress_std_dev: number;
    entities_in_progress_min: number;
    entities_in_progress_max: number;

    // Avg Cycle Time metrics
    avg_cycle_time_mean: number;
    avg_cycle_time_std_dev: number;
    avg_cycle_time_min: number;
    avg_cycle_time_max: number;

    // Avg Time In System metrics
    avg_time_in_system_mean: number;
    avg_time_in_system_std_dev: number;
    avg_time_in_system_min: number;
    avg_time_in_system_max: number;

    // Avg Entities In System metrics
    avg_entities_in_system_mean: number;
    avg_entities_in_system_std_dev: number;
    avg_entities_in_system_min: number;
    avg_entities_in_system_max: number;

    // Total Activity Cost metrics
    total_activity_cost_mean: number;
    total_activity_cost_std_dev: number;
    total_activity_cost_min: number;
    total_activity_cost_max: number;

    // Total Resource Cost metrics
    total_resource_cost_mean: number;
    total_resource_cost_std_dev: number;
    total_resource_cost_min: number;
    total_resource_cost_max: number;

    // Total Cost metrics
    total_cost_mean: number;
    total_cost_std_dev: number;
    total_cost_min: number;
    total_cost_max: number;

    // Replication count
    num_replications: number;
}
