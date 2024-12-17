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

export class StorageAdapter {
    private static readonly LEGACY_KEYS = [
        'q_objecttype',
        'q_data',
        'q_status_current',
        'q_status_prior'
    ];
    private static readonly DATA_KEY = 'q_data';
    private static readonly META_KEY = 'q_meta';
    private static readonly EXPANDED_NODES_KEY = 'q_expanded_nodes';
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
     * Gets the expanded nodes state for a page
     */
    public getExpandedNodes(page: ElementProxy): string[] {
        try {
            this.log('Getting expanded nodes for page:', page.id);
            const expandedNodesStr = page.shapeData.get(StorageAdapter.EXPANDED_NODES_KEY);
            if (!expandedNodesStr || typeof expandedNodesStr !== 'string') {
                this.log('No expanded nodes found');
                return [];
            }
            const nodes = JSON.parse(expandedNodesStr);
            this.log('Retrieved expanded nodes:', nodes);
            return nodes;
        } catch (error) {
            this.logError('Error getting expanded nodes:', error);
            return [];
        }
    }

    /**
     * Sets the expanded nodes state for a page
     */
    public setExpandedNodes(page: ElementProxy, nodeIds: string[]): void {
        try {
            this.log('Setting expanded nodes for page:', {
                pageId: page.id,
                nodes: nodeIds
            });
            const serializedNodes = JSON.stringify(nodeIds);
            page.shapeData.set(StorageAdapter.EXPANDED_NODES_KEY, serializedNodes);
            this.log('Successfully set expanded nodes');
        } catch (error) {
            this.logError('Error setting expanded nodes:', error);
            throw error;
        }
    }

    /**
     * Clears the expanded nodes state for a page
     */
    public clearExpandedNodes(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.EXPANDED_NODES_KEY);
            this.log('Successfully cleared expanded nodes');
        } catch (error) {
            this.logError('Error clearing expanded nodes:', error);
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
            this.clearExpandedNodes(page);
            this.clearElementData(page);

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