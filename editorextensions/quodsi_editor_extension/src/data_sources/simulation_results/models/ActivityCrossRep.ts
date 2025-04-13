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
  
  // Contents metrics
  contents_mean: number;
  contents_max: number;
  contents_std_dev: number;
  
  // Queue metrics
  queue_length_mean: number;
  queue_length_max: number;
  queue_length_std_dev: number;
  
  // Cycle time metrics
  cycle_time_mean: number;
  cycle_time_median: number;
  cycle_time_std_dev: number;
  cycle_time_cv: number;
  
  // Waiting time metrics
  waiting_time_mean: number;
  waiting_time_median: number;
  waiting_time_std_dev: number;
  waiting_time_cv: number;
  
  // Blocked time metrics
  blocked_time_mean: number;
  blocked_time_median: number;
  blocked_time_std_dev: number;
  blocked_time_cv: number;
  
  // Flow statistics
  arrivals_mean: number;
  arrivals_max: number;
  arrivals_std_dev: number;
  captures_mean: number;
  captures_max: number;
  captures_std_dev: number;
  releases_mean: number;
  releases_max: number;
  releases_std_dev: number;
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
    
    // Contents metrics
    contents_mean: itemFields.get('contents_mean') as number,
    contents_max: itemFields.get('contents_max') as number,
    contents_std_dev: itemFields.get('contents_std_dev') as number,
    
    // Queue metrics
    queue_length_mean: itemFields.get('queue_length_mean') as number,
    queue_length_max: itemFields.get('queue_length_max') as number,
    queue_length_std_dev: itemFields.get('queue_length_std_dev') as number,
    
    // Cycle time metrics
    cycle_time_mean: itemFields.get('cycle_time_mean') as number,
    cycle_time_median: itemFields.get('cycle_time_median') as number,
    cycle_time_std_dev: itemFields.get('cycle_time_std_dev') as number,
    cycle_time_cv: itemFields.get('cycle_time_cv') as number,
    
    // Waiting time metrics
    waiting_time_mean: itemFields.get('waiting_time_mean') as number,
    waiting_time_median: itemFields.get('waiting_time_median') as number,
    waiting_time_std_dev: itemFields.get('waiting_time_std_dev') as number,
    waiting_time_cv: itemFields.get('waiting_time_cv') as number,
    
    // Blocked time metrics
    blocked_time_mean: itemFields.get('blocked_time_mean') as number,
    blocked_time_median: itemFields.get('blocked_time_median') as number,
    blocked_time_std_dev: itemFields.get('blocked_time_std_dev') as number,
    blocked_time_cv: itemFields.get('blocked_time_cv') as number,
    
    // Flow statistics
    arrivals_mean: itemFields.get('arrivals_mean') as number,
    arrivals_max: itemFields.get('arrivals_max') as number,
    arrivals_std_dev: itemFields.get('arrivals_std_dev') as number,
    captures_mean: itemFields.get('captures_mean') as number,
    captures_max: itemFields.get('captures_max') as number,
    captures_std_dev: itemFields.get('captures_std_dev') as number,
    releases_mean: itemFields.get('releases_mean') as number,
    releases_max: itemFields.get('releases_max') as number,
    releases_std_dev: itemFields.get('releases_std_dev') as number
  };
}