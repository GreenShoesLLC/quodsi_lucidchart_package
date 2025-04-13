import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the entity_rep collection
 * Contains per-replication entity statistics
 */
export interface EntityRep {
  id: string;
  scenario_id: string;
  scenario_name: string;
  entity_id: string;
  entity_name: string;
  rep: number;
  
  // Core metrics
  entity_count: number;
  completed_count: number;
  in_progress_count: number;
  throughput_rate: number;
  
  // Exit time metrics
  first_exit: number;
  last_exit: number;
  
  // Interval metrics
  avg_interval: number;
  min_interval: number;
  max_interval: number;
  
  // Time metrics
  avg_time_in_system: number;
  avg_time_waiting: number;
  avg_time_blocked: number;
  avg_time_in_operation: number;
  avg_time_connecting: number;
  
  // Percentage metrics
  percent_waiting: number;
  percent_blocked: number;
  percent_operation: number;
  percent_connecting: number;
}

/**
 * Converts raw collection item data to a strongly typed EntityRep object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed EntityRep object
 */
export function mapToEntityRep(itemFields: MapProxy<string, any>): EntityRep {
  return {
    id: itemFields.get('id') as string,
    scenario_id: itemFields.get('scenario_id') as string,
    scenario_name: itemFields.get('scenario_name') as string,
    entity_id: itemFields.get('entity_id') as string,
    entity_name: itemFields.get('entity_name') as string,
    rep: itemFields.get('rep') as number,
    
    // Core metrics
    entity_count: itemFields.get('entity_count') as number,
    completed_count: itemFields.get('completed_count') as number,
    in_progress_count: itemFields.get('in_progress_count') as number,
    throughput_rate: itemFields.get('throughput_rate') as number,
    
    // Exit time metrics
    first_exit: itemFields.get('first_exit') as number,
    last_exit: itemFields.get('last_exit') as number,
    
    // Interval metrics
    avg_interval: itemFields.get('avg_interval') as number,
    min_interval: itemFields.get('min_interval') as number,
    max_interval: itemFields.get('max_interval') as number,
    
    // Time metrics
    avg_time_in_system: itemFields.get('avg_time_in_system') as number,
    avg_time_waiting: itemFields.get('avg_time_waiting') as number,
    avg_time_blocked: itemFields.get('avg_time_blocked') as number,
    avg_time_in_operation: itemFields.get('avg_time_in_operation') as number,
    avg_time_connecting: itemFields.get('avg_time_connecting') as number,
    
    // Percentage metrics
    percent_waiting: itemFields.get('percent_waiting') as number,
    percent_blocked: itemFields.get('percent_blocked') as number,
    percent_operation: itemFields.get('percent_operation') as number,
    percent_connecting: itemFields.get('percent_connecting') as number
  };
}