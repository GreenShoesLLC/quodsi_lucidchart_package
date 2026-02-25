import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the entity_cross_rep collection
 * Contains cross-replication statistics for entities
 */
export interface EntityCrossRep {
  id: string;
  scenario_id: string;
  scenario_name: string;
  entity_id: string;
  entity_name: string;
  
  // Created statistics (entities created)
  created_mean: number;
  created_median: number;
  created_std_dev: number;
  
  // Completed count statistics
  completed_count_mean: number;
  completed_count_median: number;
  completed_count_std_dev: number;
  
  // In progress count statistics
  in_progress_count_mean: number;
  in_progress_count_median: number;
  in_progress_count_std_dev: number;
  
  // Throughput rate statistics
  throughput_rate_mean: number;
  throughput_rate_median: number;
  throughput_rate_std_dev: number;
  throughput_rate_cv: number;
  
  // Interval statistics
  interval_mean: number;
  interval_median: number;
  interval_std_dev: number;
  interval_cv: number;
  
  // Overall interval statistics
  overall_interval_mean: number;
  overall_interval_median: number;
  overall_interval_std_dev: number;
  overall_interval_cv: number;
  
  // First exit statistics
  first_exit_mean: number;
  first_exit_median: number;
  first_exit_std_dev: number;
  
  // Last exit statistics
  last_exit_mean: number;
  last_exit_median: number;
  last_exit_std_dev: number;
  
  // Time in system statistics
  time_in_system_mean: number;
  time_in_system_median: number;
  time_in_system_std_dev: number;
  
  // Time waiting statistics
  time_resource_wait_mean: number;
  time_resource_wait_median: number;
  time_resource_wait_std_dev: number;
  
  // Time blocked statistics
  time_queue_wait_mean: number;
  time_queue_wait_median: number;
  time_queue_wait_std_dev: number;
  
  // Time in operation statistics
  time_in_operation_mean: number;
  time_in_operation_median: number;
  time_in_operation_std_dev: number;
  
  // Time connecting statistics
  time_connecting_mean: number;
  time_connecting_median: number;
  time_connecting_std_dev: number;
  
  // Percentage metrics
  percent_resource_wait_mean: number;
  percent_resource_wait_std_dev: number;
  percent_queue_wait_mean: number;
  percent_queue_wait_std_dev: number;
  percent_operation_mean: number;
  percent_operation_std_dev: number;
  percent_connecting_mean: number;
  percent_connecting_std_dev: number;
}

/**
 * Converts raw collection item data to a strongly typed EntityCrossRep object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed EntityCrossRep object
 */
export function mapToEntityCrossRep(itemFields: MapProxy<string, any>): EntityCrossRep {
  return {
    id: itemFields.get('id') as string,
    scenario_id: itemFields.get('scenario_id') as string,
    scenario_name: itemFields.get('scenario_name') as string,
    entity_id: itemFields.get('entity_id') as string,
    entity_name: itemFields.get('entity_name') as string,
    
    // Created statistics
    created_mean: itemFields.get('created_mean') as number,
    created_median: itemFields.get('created_median') as number,
    created_std_dev: itemFields.get('created_std_dev') as number,
    
    // Completed count statistics
    completed_count_mean: itemFields.get('completed_count_mean') as number,
    completed_count_median: itemFields.get('completed_count_median') as number,
    completed_count_std_dev: itemFields.get('completed_count_std_dev') as number,
    
    // In progress count statistics
    in_progress_count_mean: itemFields.get('in_progress_count_mean') as number,
    in_progress_count_median: itemFields.get('in_progress_count_median') as number,
    in_progress_count_std_dev: itemFields.get('in_progress_count_std_dev') as number,
    
    // Throughput rate statistics
    throughput_rate_mean: itemFields.get('throughput_rate_mean') as number,
    throughput_rate_median: itemFields.get('throughput_rate_median') as number,
    throughput_rate_std_dev: itemFields.get('throughput_rate_std_dev') as number,
    throughput_rate_cv: itemFields.get('throughput_rate_cv') as number,
    
    // Interval statistics
    interval_mean: itemFields.get('interval_mean') as number,
    interval_median: itemFields.get('interval_median') as number,
    interval_std_dev: itemFields.get('interval_std_dev') as number,
    interval_cv: itemFields.get('interval_cv') as number,
    
    // Overall interval statistics
    overall_interval_mean: itemFields.get('overall_interval_mean') as number,
    overall_interval_median: itemFields.get('overall_interval_median') as number,
    overall_interval_std_dev: itemFields.get('overall_interval_std_dev') as number,
    overall_interval_cv: itemFields.get('overall_interval_cv') as number,
    
    // First exit statistics
    first_exit_mean: itemFields.get('first_exit_mean') as number,
    first_exit_median: itemFields.get('first_exit_median') as number,
    first_exit_std_dev: itemFields.get('first_exit_std_dev') as number,
    
    // Last exit statistics
    last_exit_mean: itemFields.get('last_exit_mean') as number,
    last_exit_median: itemFields.get('last_exit_median') as number,
    last_exit_std_dev: itemFields.get('last_exit_std_dev') as number,
    
    // Time in system statistics
    time_in_system_mean: itemFields.get('time_in_system_mean') as number,
    time_in_system_median: itemFields.get('time_in_system_median') as number,
    time_in_system_std_dev: itemFields.get('time_in_system_std_dev') as number,
    
    // Time waiting statistics
    time_resource_wait_mean: itemFields.get('time_resource_wait_mean') as number,
    time_resource_wait_median: itemFields.get('time_resource_wait_median') as number,
    time_resource_wait_std_dev: itemFields.get('time_resource_wait_std_dev') as number,
    
    // Time blocked statistics
    time_queue_wait_mean: itemFields.get('time_queue_wait_mean') as number,
    time_queue_wait_median: itemFields.get('time_queue_wait_median') as number,
    time_queue_wait_std_dev: itemFields.get('time_queue_wait_std_dev') as number,
    
    // Time in operation statistics
    time_in_operation_mean: itemFields.get('time_in_operation_mean') as number,
    time_in_operation_median: itemFields.get('time_in_operation_median') as number,
    time_in_operation_std_dev: itemFields.get('time_in_operation_std_dev') as number,
    
    // Time connecting statistics
    time_connecting_mean: itemFields.get('time_connecting_mean') as number,
    time_connecting_median: itemFields.get('time_connecting_median') as number,
    time_connecting_std_dev: itemFields.get('time_connecting_std_dev') as number,
    
    // Percentage metrics
    percent_resource_wait_mean: itemFields.get('percent_resource_wait_mean') as number,
    percent_resource_wait_std_dev: itemFields.get('percent_resource_wait_std_dev') as number,
    percent_queue_wait_mean: itemFields.get('percent_queue_wait_mean') as number,
    percent_queue_wait_std_dev: itemFields.get('percent_queue_wait_std_dev') as number,
    percent_operation_mean: itemFields.get('percent_operation_mean') as number,
    percent_operation_std_dev: itemFields.get('percent_operation_std_dev') as number,
    percent_connecting_mean: itemFields.get('percent_connecting_mean') as number,
    percent_connecting_std_dev: itemFields.get('percent_connecting_std_dev') as number
  };
}