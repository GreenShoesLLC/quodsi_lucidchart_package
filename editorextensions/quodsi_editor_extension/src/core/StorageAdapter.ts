import { ElementProxy, PageProxy } from 'lucid-extension-sdk';
import { PageStatus, SimulationObjectType, ISerializedState, ISerializedResourceRequirement, ISerializedTimePattern, ISerializedTimeDistributedConfig } from '@quodsi/shared';
import { MetaData } from '@quodsi/shared';

/**
 * Shape data storage format
 */
export interface StorageFormat<T = any> {
    data: T;
    meta: MetaData;
}

export class StorageAdapter {
    private static readonly LEGACY_KEYS = [
        'q_objecttype',
        'q_data',
        'q_status_current',
        'q_status_prior'
    ];
    private static readonly DATA_KEY = 'q_data';
    private static readonly META_KEY = 'q_meta';
    private static readonly SIMULATION_STATUS_KEY = 'q_simulation_status';
    private static readonly STATES_KEY = 'q_states';
    private static readonly RESOURCE_REQUIREMENTS_KEY = 'q_res_requirements';
    private static readonly TIME_PATTERNS_KEY = 'q_time_patterns';
    private static readonly TIME_DISTRIBUTED_CONFIGS_KEY = 'q_time_distributed_configs';
    private static readonly CURRENT_VERSION = '1.0.0';
    private static readonly LOG_PREFIX = '[StorageAdapter]';
    private loggingEnabled: boolean = false;

    constructor() {
        this.log('StorageAdapter initialized');
    }

    public setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
        this.log(`Logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    private isLoggingEnabled(): boolean {
        return this.loggingEnabled;
    }

    private log(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.log(`${StorageAdapter.LOG_PREFIX} ${message}`, ...args);
        }
    }

    private logError(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.error(`${StorageAdapter.LOG_PREFIX} ${message}`, ...args);
        }
    }

    /**
     * Checks if an element has been converted to a Quodsi model element
     */
    public isQuodsiModel(element: ElementProxy): boolean {
        try {
            const meta = this.getMetadata(element);
            return meta !== null && meta.type === SimulationObjectType.Model;
        } catch (error) {
            this.logError('Error checking model status:', error);
            return false;
        }
    }

    /**
     * Sets the simulation status for a page
     */
    public setSimulationStatus(page: ElementProxy, status: PageStatus): void {
        try {
            this.log('Setting simulation status for page:', {
                pageId: page.id,
                status
            });
            const serializedStatus = JSON.stringify(status);
            page.shapeData.set(StorageAdapter.SIMULATION_STATUS_KEY, serializedStatus);
            this.log('Successfully set simulation status');
        } catch (error) {
            this.logError('Error setting simulation status:', error);
            throw error;
        }
    }

    /**
     * Gets the simulation status for a page
     */
    public getSimulationStatus(page: ElementProxy): PageStatus | null {
        try {
            this.log('Getting simulation status for page:', page.id);
            const statusStr = page.shapeData.get(StorageAdapter.SIMULATION_STATUS_KEY);
            if (!statusStr || typeof statusStr !== 'string') {
                this.log('No simulation status found');
                return null;
            }
            const status = JSON.parse(statusStr) as PageStatus;
            this.log('Retrieved simulation status:', status);
            return status;
        } catch (error) {
            this.logError('Error getting simulation status:', error);
            return null;
        }
    }
    /**
     * Clears the simulation status for a page
     */
    public clearSimulationStatus(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.SIMULATION_STATUS_KEY);
            this.log('Successfully cleared simulation status');
        } catch (error) {
            this.logError('Error clearing simulation status:', error);
            throw error;
        }
    }

    /**
     * Sets the states array for a page
     */
    public setStates(page: ElementProxy, states: ISerializedState[]): void {
        try {
            this.log('Setting states for page:', {
                pageId: page.id,
                statesCount: states.length
            });
            const serializedStates = JSON.stringify(states);
            page.shapeData.set(StorageAdapter.STATES_KEY, serializedStates);
            this.log('Successfully set states');
        } catch (error) {
            this.logError('Error setting states:', error);
            throw error;
        }
    }

    /**
     * Gets the states array for a page
     */
    public getStates(page: ElementProxy): ISerializedState[] {
        try {
            this.log('Getting states for page:', page.id);
            const statesStr = page.shapeData.get(StorageAdapter.STATES_KEY);
            if (!statesStr || typeof statesStr !== 'string') {
                this.log('No states found, returning empty array');
                return [];
            }
            const states = JSON.parse(statesStr) as ISerializedState[];
            this.log('Retrieved states:', { count: states.length });
            return states;
        } catch (error) {
            this.logError('Error getting states:', error);
            return [];
        }
    }

    /**
     * Clears the states array for a page
     */
    public clearStates(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.STATES_KEY);
            this.log('Successfully cleared states');
        } catch (error) {
            this.logError('Error clearing states:', error);
            throw error;
        }
    }

    /**
     * Sets the resource requirements array for a page
     */
    public setResourceRequirements(page: ElementProxy, requirements: ISerializedResourceRequirement[]): void {
        try {
            this.log('Setting resource requirements for page:', {
                pageId: page.id,
                requirementsCount: requirements.length
            });
            const serializedRequirements = JSON.stringify(requirements);
            page.shapeData.set(StorageAdapter.RESOURCE_REQUIREMENTS_KEY, serializedRequirements);
            this.log('Successfully set resource requirements');
        } catch (error) {
            this.logError('Error setting resource requirements:', error);
            throw error;
        }
    }

    /**
     * Gets the resource requirements array for a page
     */
    public getResourceRequirements(page: ElementProxy): ISerializedResourceRequirement[] {
        try {
            this.log('Getting resource requirements for page:', page.id);
            const requirementsStr = page.shapeData.get(StorageAdapter.RESOURCE_REQUIREMENTS_KEY);
            if (!requirementsStr || typeof requirementsStr !== 'string') {
                this.log('No resource requirements found, returning empty array');
                return [];
            }
            const requirements = JSON.parse(requirementsStr) as ISerializedResourceRequirement[];
            this.log('Retrieved resource requirements:', { count: requirements.length });
            return requirements;
        } catch (error) {
            this.logError('Error getting resource requirements:', error);
            return [];
        }
    }

    /**
     * Clears the resource requirements array for a page
     */
    public clearResourceRequirements(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.RESOURCE_REQUIREMENTS_KEY);
            this.log('Successfully cleared resource requirements');
        } catch (error) {
            this.logError('Error clearing resource requirements:', error);
            throw error;
        }
    }

    /**
     * Sets the time patterns array for a page
     */
    public setTimePatterns(page: ElementProxy, patterns: ISerializedTimePattern[]): void {
        try {
            this.log('Setting time patterns for page:', {
                pageId: page.id,
                patternsCount: patterns.length
            });
            const serializedPatterns = JSON.stringify(patterns);
            page.shapeData.set(StorageAdapter.TIME_PATTERNS_KEY, serializedPatterns);
            this.log('Successfully set time patterns');
        } catch (error) {
            this.logError('Error setting time patterns:', error);
            throw error;
        }
    }

    /**
     * Gets the time patterns array for a page
     */
    public getTimePatterns(page: ElementProxy): ISerializedTimePattern[] {
        try {
            this.log('Getting time patterns for page:', page.id);
            const patternsStr = page.shapeData.get(StorageAdapter.TIME_PATTERNS_KEY);
            if (!patternsStr || typeof patternsStr !== 'string') {
                this.log('No time patterns found, returning empty array');
                return [];
            }
            const patterns = JSON.parse(patternsStr) as ISerializedTimePattern[];
            this.log('Retrieved time patterns:', { count: patterns.length });
            return patterns;
        } catch (error) {
            this.logError('Error getting time patterns:', error);
            return [];
        }
    }

    /**
     * Clears the time patterns array for a page
     */
    public clearTimePatterns(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.TIME_PATTERNS_KEY);
            this.log('Successfully cleared time patterns');
        } catch (error) {
            this.logError('Error clearing time patterns:', error);
            throw error;
        }
    }

    /**
     * Sets the time distributed configs array for a page
     */
    public setTimeDistributedConfigs(page: ElementProxy, configs: ISerializedTimeDistributedConfig[]): void {
        try {
            this.log('Setting time distributed configs for page:', {
                pageId: page.id,
                configsCount: configs.length
            });
            const serializedConfigs = JSON.stringify(configs);
            page.shapeData.set(StorageAdapter.TIME_DISTRIBUTED_CONFIGS_KEY, serializedConfigs);
            this.log('Successfully set time distributed configs');
        } catch (error) {
            this.logError('Error setting time distributed configs:', error);
            throw error;
        }
    }

    /**
     * Gets the time distributed configs array for a page
     */
    public getTimeDistributedConfigs(page: ElementProxy): ISerializedTimeDistributedConfig[] {
        try {
            this.log('Getting time distributed configs for page:', page.id);
            const configsStr = page.shapeData.get(StorageAdapter.TIME_DISTRIBUTED_CONFIGS_KEY);
            if (!configsStr || typeof configsStr !== 'string') {
                this.log('No time distributed configs found, returning empty array');
                return [];
            }
            const configs = JSON.parse(configsStr) as ISerializedTimeDistributedConfig[];
            this.log('Retrieved time distributed configs:', { count: configs.length });
            return configs;
        } catch (error) {
            this.logError('Error getting time distributed configs:', error);
            return [];
        }
    }

    /**
     * Clears the time distributed configs array for a page
     */
    public clearTimeDistributedConfigs(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.TIME_DISTRIBUTED_CONFIGS_KEY);
            this.log('Successfully cleared time distributed configs');
        } catch (error) {
            this.logError('Error clearing time distributed configs:', error);
            throw error;
        }
    }

    /**
     * Sets both data and metadata for an element, keeping them properly separated
     */
    public setElementData<T extends { id: string }>(
        element: ElementProxy,
        data: T,
        type: SimulationObjectType,
        options: Partial<Omit<MetaData, 'type' | 'lastModified'>> = {}
    ): void {
        try {
            // Create clean metadata without any data fields
            const meta: MetaData = {
                type,
                version: options.version || this.CURRENT_VERSION,
                lastModified: new Date().toISOString(),
                id: data.id  // Use the ID from the data object
            };

            // Create a clean data object without metadata fields
            const cleanData = this.stripMetadataFields(data);

            // Serialize both separately
            const serializedData = JSON.stringify(cleanData);
            const serializedMeta = JSON.stringify(meta);

            // Store separately
            element.shapeData.set(StorageAdapter.DATA_KEY, serializedData);
            element.shapeData.set(StorageAdapter.META_KEY, serializedMeta);

            this.log('Successfully set element data:', {
                elementId: data.id,
                type: type,
                dataKeys: Object.keys(cleanData)
            });
        } catch (error) {
            this.logError('Error setting element data:', error);
            throw error;
        }
    }

    /**
     * Updates only the data portion of an element's storage
     */
    public updateElementData<T extends { id: string }>(element: ElementProxy, data: T): void {
        try {
            const existingMeta = this.getMetadata(element);
            if (!existingMeta) {
                throw new Error('No metadata found for element');
            }

            // Clean the data object before storing
            const cleanData = this.stripMetadataFields(data);
            const serializedData = JSON.stringify(cleanData);

            // Update data
            element.shapeData.set(StorageAdapter.DATA_KEY, serializedData);

            // Update lastModified in metadata
            existingMeta.lastModified = new Date().toISOString();
            const serializedMeta = JSON.stringify(existingMeta);

            element.shapeData.set(StorageAdapter.META_KEY, serializedMeta);

            this.log('Successfully updated element data:', {
                elementId: data.id,
                type: existingMeta.type
            });
        } catch (error) {
            this.logError('Error updating element data:', error);
            throw new Error(`Failed to update element data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Strips metadata fields from a data object
     */
    private stripMetadataFields<T extends { id: string }>(data: T): Omit<T, 'version' | 'type' | 'lastModified'> {
        const cleanData = { ...data };

        // Remove metadata fields if they exist, except 'id' which is needed in both
        const metadataFields = ['version', 'type', 'lastModified'];
        metadataFields.forEach(field => {
            delete cleanData[field as keyof typeof cleanData];
        });

        return cleanData;
    }

    /**
     * Retrieves metadata for an element
     */
    public getMetadata(element: ElementProxy): MetaData | null {
        try {
            const metaStr = element.shapeData.get(StorageAdapter.META_KEY);
            if (!metaStr || typeof metaStr !== 'string') return null;

            return JSON.parse(metaStr) as MetaData;
        } catch (error) {
            this.logError('Error getting metadata:', error);
            return null;
        }
    }

    /**
     * Retrieves data portion for an element
     */
    public getElementData<T>(element: ElementProxy): T | null {
        try {
            this.log('Getting element data:', {
                elementId: element.id,
                elementType: typeof element,
                contextInfo: 'Attempting to retrieve stored data'
            });

            const dataStr = element.shapeData.get(StorageAdapter.DATA_KEY);

            this.log('Raw data string:', {
                exists: !!dataStr,
                isString: typeof dataStr === 'string',
                valueType: typeof dataStr,
                preview: typeof dataStr === 'string' ?
                    `${dataStr.slice(0, 100)}${dataStr.length > 100 ? '...' : ''}` :
                    String(dataStr)
            });

            if (!dataStr || typeof dataStr !== 'string') {
                this.log('No valid data found for element:', element.id);
                return null;
            }

            const parsedData = JSON.parse(dataStr) as T;

            this.log('Successfully parsed element data:', {
                elementId: element.id,
                parsedDataKeys: Object.keys(parsedData as object),
                timestamp: new Date().toISOString()
            });

            return parsedData;
        } catch (error) {
            this.logError('Error getting element data:', {
                elementId: element.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    /**
     * Gets both data and metadata as a complete storage format
     */
    public getCompleteStorage<T>(element: ElementProxy): StorageFormat<T> | null {
        try {
            const meta = this.getMetadata(element);
            const data = this.getElementData<T>(element);

            if (!meta || !data) return null;

            return { data, meta };
        } catch (error) {
            this.logError('Error getting complete storage:', error);
            return null;
        }
    }

    /**
     * Removes all Quodsi-related data from an element
     */
    public clearElementData(element: ElementProxy): void {
        try {
            const keys = [StorageAdapter.DATA_KEY, StorageAdapter.META_KEY];

            for (const key of keys) {
                // Check if the data exists first
                const value = element.shapeData.get(key);
                if (value !== undefined) {
                    try {
                        element.shapeData.delete(key);
                    } catch {
                        // If delete fails, try setting to empty string as fallback
                        element.shapeData.set(key, '');
                    }
                    this.log(`Cleared ${key} from element:`, element.id);
                } else {
                    this.log(`No ${key} found on element:`, element.id);
                }
            }
        } catch (error) {
            this.logError('Error clearing element data:', error);
            throw new Error(`Failed to clear element data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validates that an element has both required storage components
     */
    public validateStorage(element: ElementProxy): boolean {
        try {
            const dataStr = element.shapeData.get(StorageAdapter.DATA_KEY);
            const metaStr = element.shapeData.get(StorageAdapter.META_KEY);

            return typeof dataStr === 'string' && typeof metaStr === 'string';
        } catch (error) {
            this.logError('Error validating storage:', error);
            return false;
        }
    }

    /**
     * Gets the current version number used by the storage adapter
     */
    public get CURRENT_VERSION(): string {
        return StorageAdapter.CURRENT_VERSION;
    }
    private clearLegacyData(element: ElementProxy): void {
        for (const key of StorageAdapter.LEGACY_KEYS) {
            try {
                const value = element.shapeData.get(key);
                if (value !== undefined) {
                    try {
                        element.shapeData.delete(key);
                        this.log(`Successfully deleted legacy key '${key}' from element ${element.id}`);
                    } catch {
                        element.shapeData.set(key, '');
                        this.log(`Set legacy key '${key}' to empty on element ${element.id} (delete failed)`);
                    }
                }
            } catch (error) {
                this.logError(`Error handling legacy key '${key}' for element ${element.id}:`, error);
            }
        }
    }
    public clearAllModelData(page: PageProxy): void {
        try {
            // Clear model data from page

            this.clearElementData(page);
            this.clearSimulationStatus(page);
            this.clearStates(page);
            this.clearResourceRequirements(page);
            this.clearTimePatterns(page);
            this.clearTimeDistributedConfigs(page);

            // Clear data from all blocks
            for (const [, block] of page.allBlocks) {
                this.clearElementData(block);
                this.clearLegacyData(block);
            }

            // Clear data from all lines
            for (const [, line] of page.allLines) {
                this.clearElementData(line);
                this.clearLegacyData(line);
            }
        } catch (error) {
            this.logError('Error clearing model data:', error);
            throw error;
        }
    }
}