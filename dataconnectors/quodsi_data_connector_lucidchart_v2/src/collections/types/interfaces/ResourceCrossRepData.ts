/**
 * Interface for Resource Utilization data
 * Defines resource utilization metrics aggregated across replications
 * Matches the Python ResourceUtilizationCsvDto format
 */
export interface ResourceCrossRepData {
    // Identifiers
    id: string;
    scenario_id: string;
    scenario_name: string;
    resource_id: string;
    resource_name: string;

    // Utilization metrics
    utilization_mean: number;
    utilization_min: number;
    utilization_max: number;
    utilization_std_dev: number;

    // Summary metrics
    bottleneck_frequency: number;

    // Cost metrics
    seize_cost_mean: number;
    seize_cost_std_dev: number;
    seize_cost_min: number;
    seize_cost_max: number;
    utilization_cost_mean: number;
    utilization_cost_std_dev: number;
    utilization_cost_min: number;
    utilization_cost_max: number;
    idle_cost_mean: number;
    idle_cost_std_dev: number;
    idle_cost_min: number;
    idle_cost_max: number;
    total_cost_mean: number;
    total_cost_std_dev: number;
    total_cost_min: number;
    total_cost_max: number;
}
