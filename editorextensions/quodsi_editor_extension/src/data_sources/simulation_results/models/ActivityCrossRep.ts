import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the activity_cross_rep collection
 * Contains cross-replication statistics for activities
 */
export interface ActivityCrossRep {
  id: string;
  scenario_id: string;
  scenario_name: string;
  activity_id: string;
  activity_name: string;
  
  // Utilization metrics
  utilization_mean: number;
  utilization_max: number;
  utilization_std_dev: number;
  
  // Capacity metrics
  capacity_mean: number;
  capacity_max: number;
  capacity_std_dev: number;
  
  // Avg Number Allocated metrics (formerly contents)
  avg_number_allocated_mean: number;
  avg_number_allocated_max: number;
  avg_number_allocated_std_dev: number;
  
  // Queue metrics
  queue_length_mean: number;
  queue_length_max: number;
  queue_length_std_dev: number;
  
  // Cycle time metrics
  cycle_time_mean: number;
  cycle_time_median: number;
  cycle_time_std_dev: number;
  cycle_time_cv: number;
  
  // Total Time Waiting for Resource metrics (formerly waiting time)
  total_time_waiting_for_resource_mean: number;
  total_time_waiting_for_resource_median: number;
  total_time_waiting_for_resource_std_dev: number;
  total_time_waiting_for_resource_cv: number;

  // Total Time Blocked metrics (formerly blocked time)
  total_time_blocked_mean: number;
  total_time_blocked_median: number;
  total_time_blocked_std_dev: number;
  total_time_blocked_cv: number;
  
  // Flow statistics
  total_arrivals_mean: number;
  total_arrivals_max: number;
  total_arrivals_std_dev: number;
  total_allocations_mean: number;
  total_allocations_max: number;
  total_allocations_std_dev: number;
  throughput_mean: number;
  throughput_max: number;
  throughput_std_dev: number;
}

/**
 * Converts raw collection item data to a strongly typed ActivityCrossRep object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed ActivityCrossRep object
 */
export function mapToActivityCrossRep(itemFields: MapProxy<string, any>): ActivityCrossRep {
  return {
    id: itemFields.get('id') as string,
    scenario_id: itemFields.get('scenario_id') as string,
    scenario_name: itemFields.get('scenario_name') as string,
    activity_id: itemFields.get('activity_id') as string,
    activity_name: itemFields.get('activity_name') as string,
    
    // Utilization metrics
    utilization_mean: itemFields.get('utilization_mean') as number,
    utilization_max: itemFields.get('utilization_max') as number,
    utilization_std_dev: itemFields.get('utilization_std_dev') as number,
    
    // Capacity metrics
    capacity_mean: itemFields.get('capacity_mean') as number,
    capacity_max: itemFields.get('capacity_max') as number,
    capacity_std_dev: itemFields.get('capacity_std_dev') as number,
    
    // Avg Number Allocated metrics
    avg_number_allocated_mean: itemFields.get('avg_number_allocated_mean') as number,
    avg_number_allocated_max: itemFields.get('avg_number_allocated_max') as number,
    avg_number_allocated_std_dev: itemFields.get('avg_number_allocated_std_dev') as number,
    
    // Queue metrics
    queue_length_mean: itemFields.get('queue_length_mean') as number,
    queue_length_max: itemFields.get('queue_length_max') as number,
    queue_length_std_dev: itemFields.get('queue_length_std_dev') as number,
    
    // Cycle time metrics
    cycle_time_mean: itemFields.get('cycle_time_mean') as number,
    cycle_time_median: itemFields.get('cycle_time_median') as number,
    cycle_time_std_dev: itemFields.get('cycle_time_std_dev') as number,
    cycle_time_cv: itemFields.get('cycle_time_cv') as number,
    
    // Total Time Waiting for Resource metrics
    total_time_waiting_for_resource_mean: itemFields.get('total_time_waiting_for_resource_mean') as number,
    total_time_waiting_for_resource_median: itemFields.get('total_time_waiting_for_resource_median') as number,
    total_time_waiting_for_resource_std_dev: itemFields.get('total_time_waiting_for_resource_std_dev') as number,
    total_time_waiting_for_resource_cv: itemFields.get('total_time_waiting_for_resource_cv') as number,

    // Total Time Blocked metrics
    total_time_blocked_mean: itemFields.get('total_time_blocked_mean') as number,
    total_time_blocked_median: itemFields.get('total_time_blocked_median') as number,
    total_time_blocked_std_dev: itemFields.get('total_time_blocked_std_dev') as number,
    total_time_blocked_cv: itemFields.get('total_time_blocked_cv') as number,
    
    // Flow statistics
    total_arrivals_mean: itemFields.get('total_arrivals_mean') as number,
    total_arrivals_max: itemFields.get('total_arrivals_max') as number,
    total_arrivals_std_dev: itemFields.get('total_arrivals_std_dev') as number,
    total_allocations_mean: itemFields.get('total_allocations_mean') as number,
    total_allocations_max: itemFields.get('total_allocations_max') as number,
    total_allocations_std_dev: itemFields.get('total_allocations_std_dev') as number,
    throughput_mean: itemFields.get('throughput_mean') as number,
    throughput_max: itemFields.get('throughput_max') as number,
    throughput_std_dev: itemFields.get('throughput_std_dev') as number
  };
}