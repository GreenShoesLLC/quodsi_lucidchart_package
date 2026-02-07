import { ModelItemData as BaseModelItemData, SimulationObjectType, MappingSource } from '@quodsi/shared';

/**
 * Extended metadata interface that allows string type values
 */
export interface ExtendedMetaData {
  type: SimulationObjectType | string;
  id: string;
  mappingSource?: MappingSource;
}

/**
 * Extended ModelItemData interface that includes q_data properties
 * which are present in LucidChart elements but not in the base ModelItemData interface
 */
export interface ExtendedModelItemData extends Omit<BaseModelItemData, 'metadata'> {
  metadata: ExtendedMetaData;
  q_data?: {
    id?: string;
    name?: string;
    [key: string]: any;
  };
  type?: string; // LucidChart element type (block, line, etc.)
  text?: string; // LucidChart element text content
  userData?: {
    q_data?: any;
    [key: string]: any;
  };
}
