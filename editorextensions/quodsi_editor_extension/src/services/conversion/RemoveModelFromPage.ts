// RemoveModelFromPage.ts
import { PageProxy, ElementProxy } from 'lucid-extension-sdk';
import { StorageAdapter } from '../../core/StorageAdapter';

export class RemoveModelFromPage {

    private static readonly LEGACY_KEYS = [
        'q_objecttype',
        'q_data',
        'q_status_current',
        'q_status_prior'
    ];

    constructor(
        private page: PageProxy,
        private storageAdapter: StorageAdapter
    ) { }

    /**
     * Removes all model-related data from the page and its elements
     */
    public removeModel(): void {
        // Clear model data from page
        this.storageAdapter.clearElementData(this.page);

        // Clear data from all blocks
        for (const [, block] of this.page.allBlocks) {
            this.storageAdapter.clearElementData(block);
        }

        // Clear data from all lines
        for (const [, line] of this.page.allLines) {
            this.storageAdapter.clearElementData(line);
        }
    }

    /**
     * Clears all model-related data from an element
     */
    private clearElementData(element: ElementProxy): void {
        try {
            // Clear data using StorageAdapter
            this.storageAdapter.clearElementData(element);

            // Clear legacy data properties
            this.clearLegacyData(element);
        } catch (error) {
            console.error(`[RemoveModelFromPage] Error clearing data from element ${element.id}:`, error);
            throw error;
        }
    }

    /**
     * Clears legacy data properties (q_objecttype and q_data)
     */
    private clearLegacyData(element: ElementProxy): void {
        for (const key of RemoveModelFromPage.LEGACY_KEYS) {
            try {
                // Check if the property exists first
                const value = element.shapeData.get(key);
                if (value !== undefined) {
                    try {
                        element.shapeData.delete(key);
                        console.log(`[RemoveModelFromPage] Successfully deleted '${key}' from element ${element.id}`);
                    } catch {
                        // If delete fails, try setting to empty string as fallback
                        element.shapeData.set(key, '');
                        console.log(`[RemoveModelFromPage] Set '${key}' to empty on element ${element.id} (delete failed)`);
                    }
                } else {
                    console.log(`[RemoveModelFromPage] No '${key}' found on element ${element.id}`);
                }
            } catch (error) {
                console.warn(`[RemoveModelFromPage] Error handling '${key}' for element ${element.id}:`, error);
            }
        }
    }
}