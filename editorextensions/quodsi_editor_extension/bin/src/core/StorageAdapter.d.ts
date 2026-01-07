import { ElementProxy, PageProxy } from 'lucid-extension-sdk';
import { PageStatus, SimulationObjectType, ISerializedState, ISerializedResourceRequirement, ISerializedTimePattern, ISerializedTimeDistributedConfig, MappingSource } from '@quodsi/shared';
import { MetaData } from '@quodsi/shared';
/**
 * Record of skipped elements with their mapping source
 */
export type SkippedElementsRecord = Record<string, MappingSource>;
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
    private static readonly SIMULATION_STATUS_KEY;
    private static readonly STATES_KEY;
    private static readonly RESOURCE_REQUIREMENTS_KEY;
    private static readonly TIME_PATTERNS_KEY;
    private static readonly TIME_DISTRIBUTED_CONFIGS_KEY;
    private static readonly SKIPPED_ELEMENTS_KEY;
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
     * Sets the simulation status for a page
     */
    setSimulationStatus(page: ElementProxy, status: PageStatus): void;
    /**
     * Gets the simulation status for a page
     */
    getSimulationStatus(page: ElementProxy): PageStatus | null;
    /**
     * Clears the simulation status for a page
     */
    clearSimulationStatus(page: ElementProxy): void;
    /**
     * Sets the states array for a page
     */
    setStates(page: ElementProxy, states: ISerializedState[]): void;
    /**
     * Gets the states array for a page
     */
    getStates(page: ElementProxy): ISerializedState[];
    /**
     * Clears the states array for a page
     */
    clearStates(page: ElementProxy): void;
    /**
     * Sets the resource requirements array for a page
     */
    setResourceRequirements(page: ElementProxy, requirements: ISerializedResourceRequirement[]): void;
    /**
     * Gets the resource requirements array for a page
     */
    getResourceRequirements(page: ElementProxy): ISerializedResourceRequirement[];
    /**
     * Clears the resource requirements array for a page
     */
    clearResourceRequirements(page: ElementProxy): void;
    /**
     * Sets the time patterns array for a page
     */
    setTimePatterns(page: ElementProxy, patterns: ISerializedTimePattern[]): void;
    /**
     * Gets the time patterns array for a page
     */
    getTimePatterns(page: ElementProxy): ISerializedTimePattern[];
    /**
     * Clears the time patterns array for a page
     */
    clearTimePatterns(page: ElementProxy): void;
    /**
     * Sets the time distributed configs array for a page
     */
    setTimeDistributedConfigs(page: ElementProxy, configs: ISerializedTimeDistributedConfig[]): void;
    /**
     * Gets the time distributed configs array for a page
     */
    getTimeDistributedConfigs(page: ElementProxy): ISerializedTimeDistributedConfig[];
    /**
     * Clears the time distributed configs array for a page
     */
    clearTimeDistributedConfigs(page: ElementProxy): void;
    /**
     * Sets the skipped elements record for a page
     * @param page The page element
     * @param skipped Record of element IDs to their mapping source ('auto' or 'user')
     */
    setSkippedElements(page: ElementProxy, skipped: SkippedElementsRecord): void;
    /**
     * Gets the skipped elements record for a page
     */
    getSkippedElements(page: ElementProxy): SkippedElementsRecord;
    /**
     * Clears the skipped elements record for a page
     */
    clearSkippedElements(page: ElementProxy): void;
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