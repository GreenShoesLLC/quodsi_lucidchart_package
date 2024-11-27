// core/StorageAdapter.ts
import { ElementProxy } from 'lucid-extension-sdk';
import { SimulationObjectType } from '../shared/types/elements/enums/simulationObjectType';


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
     * Sets both data and metadata for an element
     */
    public setElementData<T>(
        element: ElementProxy,
        data: T,
        type: SimulationObjectType,
        options: Partial<Omit<MetaData, 'type' | 'lastModified'>> = {}
    ): void {
        try {
            // Create metadata
            const meta: MetaData = {
                id: element.id, // Use LucidChart ID
                type,
                version: options.version || this.CURRENT_VERSION,
                lastModified: new Date().toISOString()
            };

            // Ensure we're storing strings
            const serializedData = JSON.stringify(data);
            const serializedMeta = JSON.stringify(meta);

            // Verify the serialized data
            if (typeof serializedData !== 'string' || typeof serializedMeta !== 'string') {
                throw new Error('Failed to serialize data or metadata');
            }

            // Store data and metadata
            element.shapeData.set(StorageAdapter.DATA_KEY, serializedData);
            element.shapeData.set(StorageAdapter.META_KEY, serializedMeta);

            console.log('[StorageAdapter] Successfully set element data:', {
                elementId: element.id,
                type,
                dataSize: serializedData.length
            });
        } catch (error) {
            console.error('[StorageAdapter] Error setting element data:', error);
            throw new Error(`Failed to set element data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Updates only the data portion of an element's storage
     */
    public updateElementData<T>(element: ElementProxy, data: T): void {
        try {
            const existingMeta = this.getMetadata(element);
            if (!existingMeta) {
                throw new Error('No metadata found for element');
            }

            // Ensure we're storing a string
            const serializedData = JSON.stringify(data);
            if (typeof serializedData !== 'string') {
                throw new Error('Failed to serialize data');
            }

            // Update data
            element.shapeData.set(StorageAdapter.DATA_KEY, serializedData);

            // Update lastModified in metadata
            existingMeta.lastModified = new Date().toISOString();
            const serializedMeta = JSON.stringify(existingMeta);
            if (typeof serializedMeta !== 'string') {
                throw new Error('Failed to serialize metadata');
            }

            element.shapeData.set(StorageAdapter.META_KEY, serializedMeta);

            console.log('[StorageAdapter] Successfully updated element data:', {
                elementId: element.id,
                type: existingMeta.type
            });
        } catch (error) {
            console.error('[StorageAdapter] Error updating element data:', error);
            throw new Error(`Failed to update element data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Retrieves metadata for an element
     */
    public getMetadata(element: ElementProxy): MetaData | null {
        try {
            const metaStr = element.shapeData.get(StorageAdapter.META_KEY);
            if (!metaStr || typeof metaStr !== 'string') return null;

            const meta = JSON.parse(metaStr) as MetaData;
            return meta;
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
            const dataStr = element.shapeData.get(StorageAdapter.DATA_KEY);
            if (!dataStr || typeof dataStr !== 'string') return null;

            const data = JSON.parse(dataStr) as T;
            return data;
        } catch (error) {
            console.error('[StorageAdapter] Error getting element data:', error);
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