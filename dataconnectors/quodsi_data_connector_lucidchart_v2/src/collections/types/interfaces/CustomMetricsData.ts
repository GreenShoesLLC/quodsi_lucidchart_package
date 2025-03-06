/**
 * Interface for Custom Metrics data
 * Defines user-defined custom metrics from simulation outputs
 */
export interface CustomMetricsData {
    Id: string;
    Name: string;
    utilization_mean: number;
    utilization_std_dev: number;
    throughput_mean: number;
    throughput_std_dev: number;
    bottleneck_frequency: number;
}
