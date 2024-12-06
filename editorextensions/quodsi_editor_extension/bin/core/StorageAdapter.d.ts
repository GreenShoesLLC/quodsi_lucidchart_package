import { ElementProxy } from 'lucid-extension-sdk';
import { SimulationObjectType } from '@quodsi/shared';
/**
 * Metadata structure for elements
 */
export interface MetaData {
    type: SimulationObjectType;
    version: string;
    lastModified: string;
    id: string;
}
/**
 * Shape data storage format
 */
export interface StorageFormat<T = any> {
    data: T;
    meta: MetaData;
}
export declare class StorageAdapter {
    private static readonly DATA_KEY;
    private static readonly META_KEY;
    private static readonly CURRENT_VERSION;
    /**
     * Checks if an element has been converted to a Quodsi model element
     */
    isQuodsiModel(element: ElementProxy): boolean;
    /**
     * Sets both data and metadata for an element, keeping them properly separated
     */
    setElementData<T extends {
        id: string;
    }>(element: ElementProxy, data: T, type: SimulationObjectType, options?: Partial<Omit<MetaData, 'type' | 'lastModified'>>): void;
    /**
     * Updates only the data portion of an element's storage
     */
    updateElementData<T extends {
        id: string;
    }>(element: ElementProxy, data: T): void;
    /**
     * Strips metadata fields from a data object
     */
    private stripMetadataFields;
    /**
     * Retrieves metadata for an element
     */
    getMetadata(element: ElementProxy): MetaData | null;
    /**
     * Retrieves data portion for an element
     */
    getElementData<T>(element: ElementProxy): T | null;
    /**
     * Gets both data and metadata as a complete storage format
     */
    getCompleteStorage<T>(element: ElementProxy): StorageFormat<T> | null;
    /**
     * Removes all Quodsi-related data from an element
     */
    clearElementData(element: ElementProxy): void;
    /**
     * Validates that an element has both required storage components
     */
    validateStorage(element: ElementProxy): boolean;
    /**
     * Generates a unique ID for new elements
     */
    private generateId;
    /**
     * Gets the current version number used by the storage adapter
     */
    get CURRENT_VERSION(): string;
}
