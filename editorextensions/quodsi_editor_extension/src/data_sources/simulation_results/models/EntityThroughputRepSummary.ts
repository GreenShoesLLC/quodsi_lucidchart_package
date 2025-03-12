import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the entity_throughput_rep_summary collection
 */
export interface EntityThroughputRepSummary {
  id: string;
  scenario_id: string;
  scenario_name: string;
  entity_id: string;
  entity_name: string;
  rep: number;
  count: number;
  completed_count: number;
  in_progress_count: number;
  throughput_rate: number;
}

/**
 * Converts raw collection item data to a strongly typed EntityThroughputRepSummary object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed EntityThroughputRepSummary object
 */
export function mapToEntityThroughputRepSummary(itemFields: MapProxy<string, any>): EntityThroughputRepSummary {
  return {
    id: itemFields.get('id') as string,
    scenario_id: itemFields.get('scenario_id') as string,
    scenario_name: itemFields.get('scenario_name') as string,
    entity_id: itemFields.get('entity_id') as string,
    entity_name: itemFields.get('entity_name') as string,
    rep: itemFields.get('rep') as number,
    count: itemFields.get('count') as number,
    completed_count: itemFields.get('completed_count') as number,
    in_progress_count: itemFields.get('in_progress_count') as number,
    throughput_rate: itemFields.get('throughput_rate') as number
  };
}