import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the activity_rep_summary collection
 */
export interface ActivityRepSummary {
  id: string;
  scenario_id: string;
  scenario_name: string;
  activity_id: string;
  activity_name: string;
  rep: number;
  capacity: number;
  total_available_clock: number;
  total_arrivals: number;
  total_requests: number;
  total_captures: number;
  total_releases: number;
  total_time_in_capture: number;
  total_time_blocked: number;
  total_time_waiting: number;
  average_contents: number;
  maximum_contents: number;
  current_contents: number;
  utilization_percentage: number;
  throughput_rate: number;
  average_time_per_entry: number;
  average_queue_length: number;
  input_buffer_utilization: number;
  output_buffer_utilization: number;
  input_buffer_queue_time: number;
  output_buffer_queue_time: number;
  min_service_time: number;
  max_service_time: number;
  avg_service_time: number;
  service_time_variance: number;
  total_time_blocked_upstream: number;
  total_time_blocked_downstream: number;
  blocking_frequency: number;
  resource_starvation_time: number;
  resource_conflict_count: number;
  operational_efficiency: number;
  cycle_time_efficiency: number;
  first_time_through: number;
}

/**
 * Converts raw collection item data to a strongly typed ActivityRepSummary object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed ActivityRepSummary object
 */
export function mapToActivityRepSummary(itemFields: MapProxy<string, any>): ActivityRepSummary {
  return {
    id: itemFields.get('id') as string,
    scenario_id: itemFields.get('scenario_id') as string,
    scenario_name: itemFields.get('scenario_name') as string,
    activity_id: itemFields.get('activity_id') as string,
    activity_name: itemFields.get('activity_name') as string,
    rep: itemFields.get('rep') as number,
    capacity: itemFields.get('capacity') as number,
    total_available_clock: itemFields.get('total_available_clock') as number,
    total_arrivals: itemFields.get('total_arrivals') as number,
    total_requests: itemFields.get('total_requests') as number,
    total_captures: itemFields.get('total_captures') as number,
    total_releases: itemFields.get('total_releases') as number,
    total_time_in_capture: itemFields.get('total_time_in_capture') as number,
    total_time_blocked: itemFields.get('total_time_blocked') as number,
    total_time_waiting: itemFields.get('total_time_waiting') as number,
    average_contents: itemFields.get('average_contents') as number,
    maximum_contents: itemFields.get('maximum_contents') as number,
    current_contents: itemFields.get('current_contents') as number,
    utilization_percentage: itemFields.get('utilization_percentage') as number,
    throughput_rate: itemFields.get('throughput_rate') as number,
    average_time_per_entry: itemFields.get('average_time_per_entry') as number,
    average_queue_length: itemFields.get('average_queue_length') as number,
    input_buffer_utilization: itemFields.get('input_buffer_utilization') as number,
    output_buffer_utilization: itemFields.get('output_buffer_utilization') as number,
    input_buffer_queue_time: itemFields.get('input_buffer_queue_time') as number,
    output_buffer_queue_time: itemFields.get('output_buffer_queue_time') as number,
    min_service_time: itemFields.get('min_service_time') as number,
    max_service_time: itemFields.get('max_service_time') as number,
    avg_service_time: itemFields.get('avg_service_time') as number,
    service_time_variance: itemFields.get('service_time_variance') as number,
    total_time_blocked_upstream: itemFields.get('total_time_blocked_upstream') as number,
    total_time_blocked_downstream: itemFields.get('total_time_blocked_downstream') as number,
    blocking_frequency: itemFields.get('blocking_frequency') as number,
    resource_starvation_time: itemFields.get('resource_starvation_time') as number,
    resource_conflict_count: itemFields.get('resource_conflict_count') as number,
    operational_efficiency: itemFields.get('operational_efficiency') as number,
    cycle_time_efficiency: itemFields.get('cycle_time_efficiency') as number,
    first_time_through: itemFields.get('first_time_through') as number
  };
}