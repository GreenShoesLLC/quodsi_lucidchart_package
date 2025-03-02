import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the resource_rep_summary collection
 */
export interface ResourceRepSummary {
  rep: number;
  resource_id: string;
  total_requests: number;
  total_captures: number;
  total_releases: number;
  avg_capture_time: number;
  utilization_rate: number;
  total_time_waiting: number;
  avg_queue_time: number;
  max_queue_length: number;
  avg_contents: number;
}

/**
 * Converts raw collection item data to a strongly typed ResourceRepSummary object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed ResourceRepSummary object
 */
export function mapToResourceRepSummary(itemFields: MapProxy<string, any>): ResourceRepSummary {
  return {
    rep: itemFields.get('rep') as number,
    resource_id: itemFields.get('resource_id') as string,
    total_requests: itemFields.get('total_requests') as number,
    total_captures: itemFields.get('total_captures') as number,
    total_releases: itemFields.get('total_releases') as number,
    avg_capture_time: itemFields.get('avg_capture_time') as number,
    utilization_rate: itemFields.get('utilization_rate') as number,
    total_time_waiting: itemFields.get('total_time_waiting') as number,
    avg_queue_time: itemFields.get('avg_queue_time') as number,
    max_queue_length: itemFields.get('max_queue_length') as number,
    avg_contents: itemFields.get('avg_contents') as number
  };
}