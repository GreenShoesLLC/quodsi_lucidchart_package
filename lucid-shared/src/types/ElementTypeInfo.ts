import { SimulationObjectType } from '@quodsi/shared';

/**
 * Source of the mapping decision
 */
export type MappingSource = 'auto' | 'user';

/**
 * Lightweight type info extracted from element's q_data.
 * Used for type identification in ModelItemData and StorageAdapter.
 */
export interface ElementTypeInfo {
    type: SimulationObjectType;
    id: string;
    mappingSource?: MappingSource;
}