import { ModelItemData as BaseModelItemData, MetaData, SimulationObjectType } from '@quodsi/shared';

/**
 * Extended MetaData interface that allows string type values
 */
export interface ExtendedMetaData extends Omit<MetaData, 'type'> {
  type: SimulationObjectType | string;
}

/**
 * Extended ModelItemData interface that includes q_meta and q_data properties
 * which are present in LucidChart elements but not in the base ModelItemData interface
 */
export interface ExtendedModelItemData extends Omit<BaseModelItemData, 'metadata'> {
  metadata: ExtendedMetaData;
  q_meta?: {
    type?: string;
    version?: string;
    lastModified?: string;
    id?: string;
    isUnconverted?: boolean;
    [key: string]: any;
  };
  q_data?: {
    id?: string;
    name?: string;
    [key: string]: any;
  };
  type?: string; // LucidChart element type (block, line, etc.)
  text?: string; // LucidChart element text content
  userData?: {
    q_meta?: any;
    q_data?: any;
    [key: string]: any;
  };
}
