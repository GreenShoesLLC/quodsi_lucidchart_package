import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the resource_rep_summary collection
 */
export interface ResourceRepSummary {
  id: string;
  scenario_id: string;
  scenario_name: string;
  resource_id: string;
  resource_name: string;
  rep: number;
  capacity: number;
  total_available_clock: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  times_acquired: number;
  times_released: number;
  total_time_in_use: number;
  total_time_idle: number;
  total_blocking_time: number;
  average_utilization: number;
  peak_utilization: number;
  current_utilization: number;
  average_wait_time: number;
  max_wait_time: number;
  average_queue_length: number;
  max_queue_length: number;
  total_conflicts: number;
  conflict_frequency: number;
}

/**
 * Converts raw collection item data to a strongly typed ResourceRepSummary object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed ResourceRepSummary object
 */
export function mapToResourceRepSummary(itemFields: MapProxy<string, any>): ResourceRepSummary {
  return {
    id: itemFields.get('id') as string,
    scenario_id: itemFields.get('scenario_id') as string,
    scenario_name: itemFields.get('scenario_name') as string,
    resource_id: itemFields.get('resource_id') as string,
    resource_name: itemFields.get('resource_name') as string,
    rep: itemFields.get('rep') as number,
    capacity: itemFields.get('capacity') as number,
    total_available_clock: itemFields.get('total_available_clock') as number,
    total_requests: itemFields.get('total_requests') as number,
    successful_requests: itemFields.get('successful_requests') as number,
    failed_requests: itemFields.get('failed_requests') as number,
    times_acquired: itemFields.get('times_acquired') as number,
    times_released: itemFields.get('times_released') as number,
    total_time_in_use: itemFields.get('total_time_in_use') as number,
    total_time_idle: itemFields.get('total_time_idle') as number,
    total_blocking_time: itemFields.get('total_blocking_time') as number,
    average_utilization: itemFields.get('average_utilization') as number,
    peak_utilization: itemFields.get('peak_utilization') as number,
    current_utilization: itemFields.get('current_utilization') as number,
    average_wait_time: itemFields.get('average_wait_time') as number,
    max_wait_time: itemFields.get('max_wait_time') as number,
    average_queue_length: itemFields.get('average_queue_length') as number,
    max_queue_length: itemFields.get('max_queue_length') as number,
    total_conflicts: itemFields.get('total_conflicts') as number,
    conflict_frequency: itemFields.get('conflict_frequency') as number
  };
}