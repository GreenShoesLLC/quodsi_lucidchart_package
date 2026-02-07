import { ElementProxy, PageProxy } from 'lucid-extension-sdk';
import { PageStatus, SimulationObjectType, ISerializedState, ISerializedResourceRequirement, ISerializedTimePattern, ISerializedTimeDistributedConfig, MappingSource, ElementTypeInfo, QUODSI_VERSION } from '@quodsi/shared';

/**
 * Record of skipped elements with their mapping source
 */
export type SkippedElementsRecord = Record<string, MappingSource>;

export class StorageAdapter {
    private static readonly DATA_KEY = 'q_data';
    private static readonly SIMULATION_STATUS_KEY = 'q_simulation_status';
    private static readonly STATES_KEY = 'q_states';
    private static readonly RESOURCE_REQUIREMENTS_KEY = 'q_res_requirements';
    private static readonly TIME_PATTERNS_KEY = 'q_time_patterns';
    private static readonly TIME_DISTRIBUTED_CONFIGS_KEY = 'q_time_distributed_configs';
    private static readonly SKIPPED_ELEMENTS_KEY = 'q_skipped_elements';
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
            const typeInfo = this.getElementType(element);
            return typeInfo !== null && typeInfo.type === SimulationObjectType.Model;
        } catch (error) {
            this.logError('Error checking model status:', error);
            return false;
        }
    }

    /**
     * Checks if a page is a Quodsi page (has Model type in q_data)
     */
    public isQuodsiPage(page: ElementProxy): boolean {
        return this.isQuodsiModel(page);
    }

    /**
     * Gets the model version from the page's q_data
     */
    public getModelVersion(page: ElementProxy): string | null {
        try {
            const dataStr = page.shapeData.get(StorageAdapter.DATA_KEY);
            if (!dataStr || typeof dataStr !== 'string') return null;
            const data = JSON.parse(dataStr);
            return data.version || null;
        } catch (error) {
            this.logError('Error getting model version:', error);
            return null;
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
     * Sets the skipped elements record for a page
     * @param page The page element
     * @param skipped Record of element IDs to their mapping source ('auto' or 'user')
     */
    public setSkippedElements(page: ElementProxy, skipped: SkippedElementsRecord): void {
        try {
            this.log('Setting skipped elements for page:', {
                pageId: page.id,
                count: Object.keys(skipped).length
            });
            const serialized = JSON.stringify(skipped);
            page.shapeData.set(StorageAdapter.SKIPPED_ELEMENTS_KEY, serialized);
            this.log('Successfully set skipped elements');
        } catch (error) {
            this.logError('Error setting skipped elements:', error);
            throw error;
        }
    }

    /**
     * Gets the skipped elements record for a page
     */
    public getSkippedElements(page: ElementProxy): SkippedElementsRecord {
        try {
            this.log('Getting skipped elements for page:', page.id);
            const str = page.shapeData.get(StorageAdapter.SKIPPED_ELEMENTS_KEY);
            if (!str || typeof str !== 'string') {
                this.log('No skipped elements found, returning empty record');
                return {};
            }
            const skipped = JSON.parse(str) as SkippedElementsRecord;
            this.log('Retrieved skipped elements:', { count: Object.keys(skipped).length });
            return skipped;
        } catch (error) {
            this.logError('Error getting skipped elements:', error);
            return {};
        }
    }

    /**
     * Clears the skipped elements record for a page
     */
    public clearSkippedElements(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.SKIPPED_ELEMENTS_KEY);
            this.log('Successfully cleared skipped elements');
        } catch (error) {
            this.logError('Error clearing skipped elements:', error);
            throw error;
        }
    }

    /**
     * Sets element data as a single q_data key containing type, id, mappingSource, and all component data.
     * For Model (page) elements, also includes version.
     */
    public setElementData<T extends { id: string }>(
        element: ElementProxy,
        data: T,
        type: SimulationObjectType,
        options: { mappingSource?: MappingSource; version?: string } = {}
    ): void {
        try {
            // Build the merged data object: type info + component data
            const mergedData: any = {
                type,
                ...data
            };

            // Include mappingSource if provided
            if (options.mappingSource) {
                mergedData.mappingSource = options.mappingSource;
            }

            // For Model type, include version
            if (type === SimulationObjectType.Model) {
                mergedData.version = options.version || QUODSI_VERSION;
            }

            const serializedData = JSON.stringify(mergedData);
            element.shapeData.set(StorageAdapter.DATA_KEY, serializedData);

            this.log('Successfully set element data:', {
                elementId: data.id,
                type: type,
                dataKeys: Object.keys(mergedData)
            });
        } catch (error) {
            this.logError('Error setting element data:', error);
            throw error;
        }
    }

    /**
     * Updates the data portion of an element's storage.
     * Reads existing q_data, merges updates, writes back.
     */
    public updateElementData<T extends { id: string }>(element: ElementProxy, data: T): void {
        try {
            const existing = this.getElementData<any>(element);
            if (!existing) {
                throw new Error('No existing data found for element');
            }

            // Merge: preserve type/id/mappingSource/version from existing, overlay new data
            const merged = {
                ...existing,
                ...data,
                // Always preserve the type info fields from existing
                type: existing.type,
                id: existing.id,
            };

            // Preserve mappingSource if it exists in existing and not in new data
            if (existing.mappingSource && !(data as any).mappingSource) {
                merged.mappingSource = existing.mappingSource;
            }

            // Preserve version if it exists (only on Model/page)
            if (existing.version) {
                merged.version = existing.version;
            }

            const serializedData = JSON.stringify(merged);
            element.shapeData.set(StorageAdapter.DATA_KEY, serializedData);

            this.log('Successfully updated element data:', {
                elementId: data.id,
                type: existing.type
            });
        } catch (error) {
            this.logError('Error updating element data:', error);
            throw new Error(`Failed to update element data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Gets the element type info from q_data.
     * Returns { type, id, mappingSource } extracted from the stored data.
     * Replaces the old getMetadata() method.
     */
    public getElementType(element: ElementProxy): ElementTypeInfo | null {
        try {
            const dataStr = element.shapeData.get(StorageAdapter.DATA_KEY);
            if (!dataStr || typeof dataStr !== 'string') return null;

            const data = JSON.parse(dataStr);
            if (!data.type) return null;

            return {
                type: data.type as SimulationObjectType,
                id: data.id || element.id,
                mappingSource: data.mappingSource
            };
        } catch (error) {
            this.logError('Error getting element type:', error);
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
     * Removes all Quodsi-related data from an element
     */
    public clearElementData(element: ElementProxy): void {
        try {
            const key = StorageAdapter.DATA_KEY;
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
        } catch (error) {
            this.logError('Error clearing element data:', error);
            throw new Error(`Failed to clear element data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validates that an element has the required q_data storage key
     */
    public validateStorage(element: ElementProxy): boolean {
        try {
            const dataStr = element.shapeData.get(StorageAdapter.DATA_KEY);
            return typeof dataStr === 'string' && dataStr.length > 0;
        } catch (error) {
            this.logError('Error validating storage:', error);
            return false;
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
            this.clearSkippedElements(page);

            // Clear data from all blocks
            for (const [, block] of page.allBlocks) {
                this.clearElementData(block);
            }

            // Clear data from all lines
            for (const [, line] of page.allLines) {
                this.clearElementData(line);
            }
        } catch (error) {
            this.logError('Error clearing model data:', error);
            throw error;
        }
    }
}
