import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the activity_utilization collection
 */
export interface ActivityUtilization {
  Id: string;
  Name: string;
  utilization_mean: number;
  utilization_max: number;
  utilization_std_dev: number;
  capacity_mean: number;
  capacity_max: number;
  capacity_std_dev: number;
  contents_mean: number;
  contents_max: number;
  contents_std_dev: number;
  queue_length_mean: number;
  queue_length_max: number;
  queue_length_std_dev: number;
}

/**
 * Converts raw collection item data to a strongly typed ActivityUtilization object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed ActivityUtilization object
 */
export function mapToActivityUtilization(itemFields: MapProxy<string, any>): ActivityUtilization {
  return {
    Id: itemFields.get('Id') as string,
    Name: itemFields.get('Name') as string,
    utilization_mean: itemFields.get('utilization_mean') as number,
    utilization_max: itemFields.get('utilization_max') as number,
    utilization_std_dev: itemFields.get('utilization_std_dev') as number,
    capacity_mean: itemFields.get('capacity_mean') as number,
    capacity_max: itemFields.get('capacity_max') as number,
    capacity_std_dev: itemFields.get('capacity_std_dev') as number,
    contents_mean: itemFields.get('contents_mean') as number,
    contents_max: itemFields.get('contents_max') as number,
    contents_std_dev: itemFields.get('contents_std_dev') as number,
    queue_length_mean: itemFields.get('queue_length_mean') as number,
    queue_length_max: itemFields.get('queue_length_max') as number,
    queue_length_std_dev: itemFields.get('queue_length_std_dev') as number
  };
}