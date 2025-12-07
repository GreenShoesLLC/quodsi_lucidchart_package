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
  utilization_0_to_1: number;
  throughput_rate: number;
  average_time_per_entry: number;
  inbound_queue_utilization: number;
  outbound_queue_utilization: number;
  inbound_queue_queue_time: number;
  outbound_queue_queue_time: number;
  total_time_blocked_upstream: number;
  total_time_blocked_downstream: number;
  blocking_frequency: number;
  resource_starvation_time: number;
  resource_conflict_count: number;
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
    utilization_0_to_1: itemFields.get('utilization_0_to_1') as number,
    throughput_rate: itemFields.get('throughput_rate') as number,
    average_time_per_entry: itemFields.get('average_time_per_entry') as number,
    inbound_queue_utilization: itemFields.get('inbound_queue_utilization') as number,
    outbound_queue_utilization: itemFields.get('outbound_queue_utilization') as number,
    inbound_queue_queue_time: itemFields.get('inbound_queue_queue_time') as number,
    outbound_queue_queue_time: itemFields.get('outbound_queue_queue_time') as number,
    total_time_blocked_upstream: itemFields.get('total_time_blocked_upstream') as number,
    total_time_blocked_downstream: itemFields.get('total_time_blocked_downstream') as number,
    blocking_frequency: itemFields.get('blocking_frequency') as number,
    resource_starvation_time: itemFields.get('resource_starvation_time') as number,
    resource_conflict_count: itemFields.get('resource_conflict_count') as number
  };
}