import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the resource_cross_rep collection
 * Contains cross-replication statistics for resources
 */
export interface ResourceCrossRep {
  id: string;
  scenario_id: string;
  scenario_name: string;
  resource_id: string;
  resource_name: string;
  utilization_mean: number;
  utilization_min: number;
  utilization_max: number;
  utilization_std_dev: number;

  // Cost metrics
  seize_cost_mean: number;
  seize_cost_std_dev: number;
  seize_cost_min: number;
  seize_cost_max: number;
  utilization_cost_mean: number;
  utilization_cost_std_dev: number;
  utilization_cost_min: number;
  utilization_cost_max: number;
  idle_cost_mean: number;
  idle_cost_std_dev: number;
  idle_cost_min: number;
  idle_cost_max: number;
  total_cost_mean: number;
  total_cost_std_dev: number;
  total_cost_min: number;
  total_cost_max: number;
}

/**
 * Converts raw collection item data to a strongly typed ResourceCrossRep object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed ResourceCrossRep object
 */
export function mapToResourceCrossRep(itemFields: MapProxy<string, any>): ResourceCrossRep {
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

    // Cost metrics
    seize_cost_mean: itemFields.get('seize_cost_mean') as number,
    seize_cost_std_dev: itemFields.get('seize_cost_std_dev') as number,
    seize_cost_min: itemFields.get('seize_cost_min') as number,
    seize_cost_max: itemFields.get('seize_cost_max') as number,
    utilization_cost_mean: itemFields.get('utilization_cost_mean') as number,
    utilization_cost_std_dev: itemFields.get('utilization_cost_std_dev') as number,
    utilization_cost_min: itemFields.get('utilization_cost_min') as number,
    utilization_cost_max: itemFields.get('utilization_cost_max') as number,
    idle_cost_mean: itemFields.get('idle_cost_mean') as number,
    idle_cost_std_dev: itemFields.get('idle_cost_std_dev') as number,
    idle_cost_min: itemFields.get('idle_cost_min') as number,
    idle_cost_max: itemFields.get('idle_cost_max') as number,
    total_cost_mean: itemFields.get('total_cost_mean') as number,
    total_cost_std_dev: itemFields.get('total_cost_std_dev') as number,
    total_cost_min: itemFields.get('total_cost_min') as number,
    total_cost_max: itemFields.get('total_cost_max') as number
  };
}