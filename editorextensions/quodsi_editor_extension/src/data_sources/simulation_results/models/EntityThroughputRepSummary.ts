import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the entity_throughput_rep_summary collection
 */
export interface EntityThroughputRepSummary {
  rep: number;
  entity_type: string;
  count: number;
  completed_count: number;
  in_progress_count: number;
  first_exit: number;
  last_exit: number;
  avg_interval: number;
  min_interval: number;
  max_interval: number;
  throughput_rate: number;
}

/**
 * Converts raw collection item data to a strongly typed EntityThroughputRepSummary object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed EntityThroughputRepSummary object
 */
export function mapToEntityThroughputRepSummary(itemFields: MapProxy<string, any>): EntityThroughputRepSummary {
  return {
    rep: itemFields.get('rep') as number,
    entity_type: itemFields.get('entity_type') as string,
    count: itemFields.get('count') as number,
    completed_count: itemFields.get('completed_count') as number,
    in_progress_count: itemFields.get('in_progress_count') as number,
    first_exit: itemFields.get('first_exit') as number,
    last_exit: itemFields.get('last_exit') as number,
    avg_interval: itemFields.get('avg_interval') as number,
    min_interval: itemFields.get('min_interval') as number,
    max_interval: itemFields.get('max_interval') as number,
    throughput_rate: itemFields.get('throughput_rate') as number
  };
}