import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the activity_timing collection
 */
export interface ActivityTiming {
  id: string;
  scenario_id: string;
  scenario_name: string;
  activity_id: string;
  activity_name: string;
  cycle_time_mean: number;
  cycle_time_median: number;
  cycle_time_cv: number;
  cycle_time_std_dev: number;
  service_time_mean: number;
  service_time_median: number;
  service_time_cv: number;
  service_time_std_dev: number;
  waiting_time_mean: number;
  waiting_time_median: number;
  waiting_time_cv: number;
  waiting_time_std_dev: number;
  blocked_time_mean: number;
  blocked_time_median: number;
  blocked_time_cv: number;
  blocked_time_std_dev: number;
}

/**
 * Converts raw collection item data to a strongly typed ActivityTiming object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed ActivityTiming object
 */
export function mapToActivityTiming(itemFields: MapProxy<string, any>): ActivityTiming {
  return {
    id: itemFields.get('id') as string,
    scenario_id: itemFields.get('scenario_id') as string,
    scenario_name: itemFields.get('scenario_name') as string,
    activity_id: itemFields.get('activity_id') as string,
    activity_name: itemFields.get('activity_name') as string,
    cycle_time_mean: itemFields.get('cycle_time_mean') as number,
    cycle_time_median: itemFields.get('cycle_time_median') as number,
    cycle_time_cv: itemFields.get('cycle_time_cv') as number,
    cycle_time_std_dev: itemFields.get('cycle_time_std_dev') as number,
    service_time_mean: itemFields.get('service_time_mean') as number,
    service_time_median: itemFields.get('service_time_median') as number,
    service_time_cv: itemFields.get('service_time_cv') as number,
    service_time_std_dev: itemFields.get('service_time_std_dev') as number,
    waiting_time_mean: itemFields.get('waiting_time_mean') as number,
    waiting_time_median: itemFields.get('waiting_time_median') as number,
    waiting_time_cv: itemFields.get('waiting_time_cv') as number,
    waiting_time_std_dev: itemFields.get('waiting_time_std_dev') as number,
    blocked_time_mean: itemFields.get('blocked_time_mean') as number,
    blocked_time_median: itemFields.get('blocked_time_median') as number,
    blocked_time_cv: itemFields.get('blocked_time_cv') as number,
    blocked_time_std_dev: itemFields.get('blocked_time_std_dev') as number
  };
}