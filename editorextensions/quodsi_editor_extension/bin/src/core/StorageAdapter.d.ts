import { ElementProxy, PageProxy } from 'lucid-extension-sdk';
import { SimulationObjectType } from '@quodsi/shared';
import { MetaData } from '@quodsi/shared';
/**
 * Shape data storage format
 */
export interface StorageFormat<T = any> {
    data: T;
    meta: MetaData;
}
export declare class StorageAdapter {
    private static readonly LEGACY_KEYS;
    private static readonly DATA_KEY;
    private static readonly META_KEY;
    private static readonly EXPANDED_NODES_KEY;
    private static readonly CURRENT_VERSION;
    private static readonly LOG_PREFIX;
    private loggingEnabled;
    constructor();
    setLogging(enabled: boolean): void;
    private isLoggingEnabled;
    private log;
    private logError;
    /**
     * Checks if an element has been converted to a Quodsi model element
     */
    isQuodsiModel(element: ElementProxy): boolean;
    /**
     * Gets the expanded nodes state for a page
     */
    getExpandedNodes(page: ElementProxy): string[];
    /**
     * Sets the expanded nodes state for a page
     */
    setExpandedNodes(page: ElementProxy, nodeIds: string[]): void;
    /**
     * Clears the expanded nodes state for a page
     */
    clearExpandedNodes(page: ElementProxy): void;
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
     * Gets the current version number used by the storage adapter
     */
    get CURRENT_VERSION(): string;
    private clearLegacyData;
    clearAllModelData(page: PageProxy): void;
}
//# sourceMappingURL=StorageAdapter.d.ts.map