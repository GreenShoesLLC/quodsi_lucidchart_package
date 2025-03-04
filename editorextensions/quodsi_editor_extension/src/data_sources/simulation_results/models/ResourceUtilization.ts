import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the resource_utilization collection
 */
export interface ResourceUtilization {
  Id: string;
  Name: string;
  utilization_rate_mean: number;
  utilization_rate_max: number;
  utilization_rate_std_dev: number;
  contents_mean: number;
  contents_max: number;
  contents_std_dev: number;
}

/**
 * Converts raw collection item data to a strongly typed ResourceUtilization object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed ResourceUtilization object
 */
export function mapToResourceUtilization(itemFields: MapProxy<string, any>): ResourceUtilization {
  return {
    Id: itemFields.get('Id') as string,
    Name: itemFields.get('Name') as string,
    utilization_rate_mean: itemFields.get('utilization_rate_mean') as number,
    utilization_rate_max: itemFields.get('utilization_rate_max') as number,
    utilization_rate_std_dev: itemFields.get('utilization_rate_std_dev') as number,
    contents_mean: itemFields.get('contents_mean') as number,
    contents_max: itemFields.get('contents_max') as number,
    contents_std_dev: itemFields.get('contents_std_dev') as number
  };
}