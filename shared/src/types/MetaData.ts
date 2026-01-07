import { SimulationObjectType } from "./elements/SimulationObjectType";

/**
 * Source of the mapping decision
 */
export type MappingSource = 'auto' | 'user';

/**
 * Metadata structure for elements
 */
export interface MetaData {
    type: SimulationObjectType;
    version: string;
    lastModified: string;
    id: string;
    isUnconverted?: boolean;
    /** How this element was mapped - 'auto' (Quodsi detected) or 'user' (user chose) */
    mappingSource?: MappingSource;
}