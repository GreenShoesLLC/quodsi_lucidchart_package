import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the entity_state_rep_summary collection
 */
export interface EntityStateRepSummary {
  id: string;
  scenario_id: string;
  scenario_name: string;
  entity_id: string;
  entity_name: string;
  rep: number;
  count: number;
  avg_time_in_system: number;
  avg_time_waiting: number;
  avg_time_blocked: number;
  avg_time_in_operation: number;
  avg_time_connecting: number;
  percent_waiting: number;
  percent_blocked: number;
  percent_operation: number;
  percent_connecting: number;
}

/**
 * Converts raw collection item data to a strongly typed EntityStateRepSummary object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed EntityStateRepSummary object
 */
export function mapToEntityStateRepSummary(itemFields: MapProxy<string, any>): EntityStateRepSummary {
  return {
    id: itemFields.get('id') as string,
    scenario_id: itemFields.get('scenario_id') as string,
    scenario_name: itemFields.get('scenario_name') as string,
    entity_id: itemFields.get('entity_id') as string,
    entity_name: itemFields.get('entity_name') as string,
    rep: itemFields.get('rep') as number,
    count: itemFields.get('count') as number,
    avg_time_in_system: itemFields.get('avg_time_in_system') as number,
    avg_time_waiting: itemFields.get('avg_time_waiting') as number,
    avg_time_blocked: itemFields.get('avg_time_blocked') as number,
    avg_time_in_operation: itemFields.get('avg_time_in_operation') as number,
    avg_time_connecting: itemFields.get('avg_time_connecting') as number,
    percent_waiting: itemFields.get('percent_waiting') as number,
    percent_blocked: itemFields.get('percent_blocked') as number,
    percent_operation: itemFields.get('percent_operation') as number,
    percent_connecting: itemFields.get('percent_connecting') as number
  };
}