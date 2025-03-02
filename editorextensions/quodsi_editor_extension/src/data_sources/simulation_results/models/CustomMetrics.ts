import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the custom_metrics collection
 */
export interface CustomMetrics {
  Id: string;
  Name: string;
  utilization_mean: number;
  utilization_std_dev: number;
  throughput_mean: number;
  throughput_std_dev: number;
  bottleneck_frequency: number;
}

/**
 * Converts raw collection item data to a strongly typed CustomMetrics object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed CustomMetrics object
 */
export function mapToCustomMetrics(itemFields: MapProxy<string, any>): CustomMetrics {
  return {
    Id: itemFields.get('Id') as string,
    Name: itemFields.get('Name') as string,
    utilization_mean: itemFields.get('utilization_mean') as number,
    utilization_std_dev: itemFields.get('utilization_std_dev') as number,
    throughput_mean: itemFields.get('throughput_mean') as number,
    throughput_std_dev: itemFields.get('throughput_std_dev') as number,
    bottleneck_frequency: itemFields.get('bottleneck_frequency') as number
  };
}