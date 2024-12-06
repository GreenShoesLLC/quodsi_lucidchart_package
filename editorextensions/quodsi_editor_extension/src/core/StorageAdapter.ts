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

export class StorageAdapter {
    private static readonly DATA_KEY = 'q_data';
    private static readonly META_KEY = 'q_meta';
    private static readonly CURRENT_VERSION = '1.0.0';

    /**
     * Checks if an element has been converted to a Quodsi model element
     */
    public isQuodsiModel(element: ElementProxy): boolean {
        try {
            const meta = this.getMetadata(element);
            return meta !== null && meta.type === SimulationObjectType.Model;
        } catch (error) {
            console.error('[StorageAdapter] Error checking model status:', error);
            return false;
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

            console.log('[StorageAdapter] Successfully set element data:', {
                elementId: data.id,
                type: type,
                dataKeys: Object.keys(cleanData)
            });
        } catch (error) {
            console.error('[StorageAdapter] Error setting element data:', error);
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

            console.log('[StorageAdapter] Successfully updated element data:', {
                elementId: data.id,
                type: existingMeta.type
            });
        } catch (error) {
            console.error('[StorageAdapter] Error updating element data:', error);
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
            console.error('[StorageAdapter] Error getting metadata:', error);
            return null;
        }
    }

    /**
     * Retrieves data portion for an element
     */
    public getElementData<T>(element: ElementProxy): T | null {
        try {
            console.log('[StorageAdapter] Getting element data:', {
                elementId: element.id,
                elementType: typeof element,
                contextInfo: 'Attempting to retrieve stored data'
            });

            const dataStr = element.shapeData.get(StorageAdapter.DATA_KEY);

            console.log('[StorageAdapter] Raw data string:', {
                exists: !!dataStr,
                isString: typeof dataStr === 'string',
                valueType: typeof dataStr,
                preview: typeof dataStr === 'string' ?
                    `${dataStr.slice(0, 100)}${dataStr.length > 100 ? '...' : ''}` :
                    String(dataStr)
            });

            if (!dataStr || typeof dataStr !== 'string') {
                console.log('[StorageAdapter] No valid data found for element:', element.id);
                return null;
            }

            const parsedData = JSON.parse(dataStr) as T;

            console.log('[StorageAdapter] Successfully parsed element data:', {
                elementId: element.id,
                parsedDataKeys: Object.keys(parsedData as object),
                timestamp: new Date().toISOString()
            });

            return parsedData;
        } catch (error) {
            console.error('[StorageAdapter] Error getting element data:', {
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
            console.error('[StorageAdapter] Error getting complete storage:', error);
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
                    console.log(`[StorageAdapter] Cleared ${key} from element:`, element.id);
                } else {
                    console.log(`[StorageAdapter] No ${key} found on element:`, element.id);
                }
            }
        } catch (error) {
            console.error('[StorageAdapter] Error clearing element data:', error);
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
            console.error('[StorageAdapter] Error validating storage:', error);
            return false;
        }
    }

    /**
     * Generates a unique ID for new elements
     */
    private generateId(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Gets the current version number used by the storage adapter
     */
    public get CURRENT_VERSION(): string {
        return StorageAdapter.CURRENT_VERSION;
    }
}