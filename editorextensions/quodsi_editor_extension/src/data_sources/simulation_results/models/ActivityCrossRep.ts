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
  capacity_utilization_mean: number;
  capacity_utilization_max: number;
  capacity_utilization_std_dev: number;

  // Active time percentage metrics
  active_time_pct_mean: number;
  active_time_pct_min: number;
  active_time_pct_max: number;
  active_time_pct_std_dev: number;

  // Capacity metrics
  capacity_mean: number;
  capacity_max: number;
  capacity_std_dev: number;
  
  // Avg Number Allocated metrics (formerly contents)
  avg_number_allocated_mean: number;
  avg_number_allocated_max: number;
  avg_number_allocated_std_dev: number;

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

  // Total Time In Failure metrics
  total_time_in_failure_mean: number;
  total_time_in_failure_median: number;
  total_time_in_failure_std_dev: number;
  total_time_in_failure_cv: number;

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

  // Cost metrics
  fixed_cost_mean: number;
  fixed_cost_std_dev: number;
  fixed_cost_min: number;
  fixed_cost_max: number;
  processing_cost_mean: number;
  processing_cost_std_dev: number;
  processing_cost_min: number;
  processing_cost_max: number;
  operational_cost_mean: number;
  operational_cost_std_dev: number;
  operational_cost_min: number;
  operational_cost_max: number;
  total_cost_mean: number;
  total_cost_std_dev: number;
  total_cost_min: number;
  total_cost_max: number;
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
    capacity_utilization_mean: itemFields.get('capacity_utilization_mean') as number,
    capacity_utilization_max: itemFields.get('capacity_utilization_max') as number,
    capacity_utilization_std_dev: itemFields.get('capacity_utilization_std_dev') as number,

    // Active time percentage metrics
    active_time_pct_mean: itemFields.get('active_time_pct_mean') as number,
    active_time_pct_min: itemFields.get('active_time_pct_min') as number,
    active_time_pct_max: itemFields.get('active_time_pct_max') as number,
    active_time_pct_std_dev: itemFields.get('active_time_pct_std_dev') as number,

    // Capacity metrics
    capacity_mean: itemFields.get('capacity_mean') as number,
    capacity_max: itemFields.get('capacity_max') as number,
    capacity_std_dev: itemFields.get('capacity_std_dev') as number,
    
    // Avg Number Allocated metrics
    avg_number_allocated_mean: itemFields.get('avg_number_allocated_mean') as number,
    avg_number_allocated_max: itemFields.get('avg_number_allocated_max') as number,
    avg_number_allocated_std_dev: itemFields.get('avg_number_allocated_std_dev') as number,

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

    // Total Time In Failure metrics
    total_time_in_failure_mean: itemFields.get('total_time_in_failure_mean') as number,
    total_time_in_failure_median: itemFields.get('total_time_in_failure_median') as number,
    total_time_in_failure_std_dev: itemFields.get('total_time_in_failure_std_dev') as number,
    total_time_in_failure_cv: itemFields.get('total_time_in_failure_cv') as number,

    // Flow statistics
    total_arrivals_mean: itemFields.get('total_arrivals_mean') as number,
    total_arrivals_max: itemFields.get('total_arrivals_max') as number,
    total_arrivals_std_dev: itemFields.get('total_arrivals_std_dev') as number,
    total_allocations_mean: itemFields.get('total_allocations_mean') as number,
    total_allocations_max: itemFields.get('total_allocations_max') as number,
    total_allocations_std_dev: itemFields.get('total_allocations_std_dev') as number,
    throughput_mean: itemFields.get('throughput_mean') as number,
    throughput_max: itemFields.get('throughput_max') as number,
    throughput_std_dev: itemFields.get('throughput_std_dev') as number,

    // Cost metrics
    fixed_cost_mean: itemFields.get('fixed_cost_mean') as number,
    fixed_cost_std_dev: itemFields.get('fixed_cost_std_dev') as number,
    fixed_cost_min: itemFields.get('fixed_cost_min') as number,
    fixed_cost_max: itemFields.get('fixed_cost_max') as number,
    processing_cost_mean: itemFields.get('processing_cost_mean') as number,
    processing_cost_std_dev: itemFields.get('processing_cost_std_dev') as number,
    processing_cost_min: itemFields.get('processing_cost_min') as number,
    processing_cost_max: itemFields.get('processing_cost_max') as number,
    operational_cost_mean: itemFields.get('operational_cost_mean') as number,
    operational_cost_std_dev: itemFields.get('operational_cost_std_dev') as number,
    operational_cost_min: itemFields.get('operational_cost_min') as number,
    operational_cost_max: itemFields.get('operational_cost_max') as number,
    total_cost_mean: itemFields.get('total_cost_mean') as number,
    total_cost_std_dev: itemFields.get('total_cost_std_dev') as number,
    total_cost_min: itemFields.get('total_cost_min') as number,
    total_cost_max: itemFields.get('total_cost_max') as number
  };
}