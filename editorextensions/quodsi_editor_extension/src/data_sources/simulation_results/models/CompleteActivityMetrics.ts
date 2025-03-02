import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing key data from the complete_activity_metrics collection
 * Note: This is a simplified version focused on the mean/median values for each metric category
 * rather than including all statistical measures (min, max, std_dev, etc.)
 */
export interface CompleteActivityMetrics {
  Id: string;
  Name: string;
  
  // Arrivals metrics
  arrivals_mean: number;
  arrivals_median: number;
  
  // Available Time metrics
  available_time_mean: number;
  available_time_median: number;
  
  // Blocked Time metrics
  blocked_time_mean: number;
  blocked_time_median: number;
  
  // Capacity metrics
  capacity_mean: number;
  capacity_median: number;
  
  // Capture Time metrics
  capture_time_mean: number;
  capture_time_median: number;
  
  // Captures metrics
  captures_mean: number;
  captures_median: number;
  
  // Contents metrics
  contents_mean: number;
  contents_median: number;
  
  // Cycle Time metrics
  cycle_time_mean: number;
  cycle_time_median: number;
  
  // Cycle Time Efficiency metrics
  cycle_time_efficiency_mean: number;
  cycle_time_efficiency_median: number;
  
  // Downstream Blocking metrics
  downstream_blocking_mean: number;
  downstream_blocking_median: number;
  
  // First Time Through metrics
  first_time_through_mean: number;
  first_time_through_median: number;
  
  // Input Buffer Stats metrics
  input_buffer_stats_mean: number;
  input_buffer_stats_median: number;
  
  // Max Contents metrics
  max_contents_mean: number;
  max_contents_median: number;
  
  // Operational Efficiency metrics
  operational_efficiency_mean: number;
  operational_efficiency_median: number;
  
  // Output Buffer Stats metrics
  output_buffer_stats_mean: number;
  output_buffer_stats_median: number;
  
  // Queue Length metrics
  queue_length_mean: number;
  queue_length_median: number;
  
  // Releases metrics
  releases_mean: number;
  releases_median: number;
  
  // Resource Conflicts metrics
  resource_conflicts_mean: number;
  resource_conflicts_median: number;
  
  // Resource Starvation metrics
  resource_starvation_mean: number;
  resource_starvation_median: number;
  
  // Service Time metrics
  service_time_mean: number;
  service_time_median: number;
  
  // Service Time Variance metrics
  service_time_variance_mean: number;
  service_time_variance_median: number;
  
  // Throughput metrics
  throughput_mean: number;
  throughput_median: number;
  
  // Upstream Blocking metrics
  upstream_blocking_mean: number;
  upstream_blocking_median: number;
  
  // Utilization metrics
  utilization_mean: number;
  utilization_median: number;
  
  // Waiting Time metrics
  waiting_time_mean: number;
  waiting_time_median: number;
  
  // Summary statistics
  average_cycle_time: number;
  average_utilization: number;
  bottleneck_frequency: number;
  capacity_loss_breakdown: string;
  improvement_opportunities: string;
  peak_utilization: number;
  total_activities: number;
  total_throughput: number;
}

/**
 * Converts raw collection item data to a strongly typed CompleteActivityMetrics object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed CompleteActivityMetrics object
 */
export function mapToCompleteActivityMetrics(itemFields: MapProxy<string, any>): CompleteActivityMetrics {
  return {
    Id: itemFields.get('Id') as string,
    Name: itemFields.get('Name') as string,
    
    // Arrivals metrics
    arrivals_mean: itemFields.get('arrivals_mean') as number,
    arrivals_median: itemFields.get('arrivals_median') as number,
    
    // Available Time metrics
    available_time_mean: itemFields.get('available_time_mean') as number,
    available_time_median: itemFields.get('available_time_median') as number,
    
    // Blocked Time metrics
    blocked_time_mean: itemFields.get('blocked_time_mean') as number,
    blocked_time_median: itemFields.get('blocked_time_median') as number,
    
    // Capacity metrics
    capacity_mean: itemFields.get('capacity_mean') as number,
    capacity_median: itemFields.get('capacity_median') as number,
    
    // Capture Time metrics
    capture_time_mean: itemFields.get('capture_time_mean') as number,
    capture_time_median: itemFields.get('capture_time_median') as number,
    
    // Captures metrics
    captures_mean: itemFields.get('captures_mean') as number,
    captures_median: itemFields.get('captures_median') as number,
    
    // Contents metrics
    contents_mean: itemFields.get('contents_mean') as number,
    contents_median: itemFields.get('contents_median') as number,
    
    // Cycle Time metrics
    cycle_time_mean: itemFields.get('cycle_time_mean') as number,
    cycle_time_median: itemFields.get('cycle_time_median') as number,
    
    // Cycle Time Efficiency metrics
    cycle_time_efficiency_mean: itemFields.get('cycle_time_efficiency_mean') as number,
    cycle_time_efficiency_median: itemFields.get('cycle_time_efficiency_median') as number,
    
    // Downstream Blocking metrics
    downstream_blocking_mean: itemFields.get('downstream_blocking_mean') as number,
    downstream_blocking_median: itemFields.get('downstream_blocking_median') as number,
    
    // First Time Through metrics
    first_time_through_mean: itemFields.get('first_time_through_mean') as number,
    first_time_through_median: itemFields.get('first_time_through_median') as number,
    
    // Input Buffer Stats metrics
    input_buffer_stats_mean: itemFields.get('input_buffer_stats_mean') as number,
    input_buffer_stats_median: itemFields.get('input_buffer_stats_median') as number,
    
    // Max Contents metrics
    max_contents_mean: itemFields.get('max_contents_mean') as number,
    max_contents_median: itemFields.get('max_contents_median') as number,
    
    // Operational Efficiency metrics
    operational_efficiency_mean: itemFields.get('operational_efficiency_mean') as number,
    operational_efficiency_median: itemFields.get('operational_efficiency_median') as number,
    
    // Output Buffer Stats metrics
    output_buffer_stats_mean: itemFields.get('output_buffer_stats_mean') as number,
    output_buffer_stats_median: itemFields.get('output_buffer_stats_median') as number,
    
    // Queue Length metrics
    queue_length_mean: itemFields.get('queue_length_mean') as number,
    queue_length_median: itemFields.get('queue_length_median') as number,
    
    // Releases metrics
    releases_mean: itemFields.get('releases_mean') as number,
    releases_median: itemFields.get('releases_median') as number,
    
    // Resource Conflicts metrics
    resource_conflicts_mean: itemFields.get('resource_conflicts_mean') as number,
    resource_conflicts_median: itemFields.get('resource_conflicts_median') as number,
    
    // Resource Starvation metrics
    resource_starvation_mean: itemFields.get('resource_starvation_mean') as number,
    resource_starvation_median: itemFields.get('resource_starvation_median') as number,
    
    // Service Time metrics
    service_time_mean: itemFields.get('service_time_mean') as number,
    service_time_median: itemFields.get('service_time_median') as number,
    
    // Service Time Variance metrics
    service_time_variance_mean: itemFields.get('service_time_variance_mean') as number,
    service_time_variance_median: itemFields.get('service_time_variance_median') as number,
    
    // Throughput metrics
    throughput_mean: itemFields.get('throughput_mean') as number,
    throughput_median: itemFields.get('throughput_median') as number,
    
    // Upstream Blocking metrics
    upstream_blocking_mean: itemFields.get('upstream_blocking_mean') as number,
    upstream_blocking_median: itemFields.get('upstream_blocking_median') as number,
    
    // Utilization metrics
    utilization_mean: itemFields.get('utilization_mean') as number,
    utilization_median: itemFields.get('utilization_median') as number,
    
    // Waiting Time metrics
    waiting_time_mean: itemFields.get('waiting_time_mean') as number,
    waiting_time_median: itemFields.get('waiting_time_median') as number,
    
    // Summary statistics
    average_cycle_time: itemFields.get('average_cycle_time') as number,
    average_utilization: itemFields.get('average_utilization') as number,
    bottleneck_frequency: itemFields.get('bottleneck_frequency') as number,
    capacity_loss_breakdown: itemFields.get('capacity_loss_breakdown') as string,
    improvement_opportunities: itemFields.get('improvement_opportunities') as string,
    peak_utilization: itemFields.get('peak_utilization') as number,
    total_activities: itemFields.get('total_activities') as number,
    total_throughput: itemFields.get('total_throughput') as number
  };
}