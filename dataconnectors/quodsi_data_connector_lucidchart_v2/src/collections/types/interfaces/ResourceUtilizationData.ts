/**
 * Interface for Resource Utilization data
 * Defines resource utilization metrics aggregated across replications
 * Matches the Python ResourceUtilizationCsvDto format
 */
export interface ResourceUtilizationData {
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
}
