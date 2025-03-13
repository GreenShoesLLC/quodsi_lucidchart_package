import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the resource_utilization collection
 */
export interface ResourceUtilization {
  id: string;
  scenario_id: string;
  scenario_name: string;
  resource_id: string;
  resource_name: string;
  utilization_mean: number;
  utilization_min: number;
  utilization_max: number;
  utilization_std_dev: number;
  bottleneck_frequency: number;
}

/**
 * Converts raw collection item data to a strongly typed ResourceUtilization object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed ResourceUtilization object
 */
export function mapToResourceUtilization(itemFields: MapProxy<string, any>): ResourceUtilization {
  return {
    id: itemFields.get('id') as string,
    scenario_id: itemFields.get('scenario_id') as string,
    scenario_name: itemFields.get('scenario_name') as string,
    resource_id: itemFields.get('resource_id') as string,
    resource_name: itemFields.get('resource_name') as string,
    utilization_mean: itemFields.get('utilization_mean') as number,
    utilization_min: itemFields.get('utilization_min') as number,
    utilization_max: itemFields.get('utilization_max') as number,
    utilization_std_dev: itemFields.get('utilization_std_dev') as number,
    bottleneck_frequency: itemFields.get('bottleneck_frequency') as number
  };
}