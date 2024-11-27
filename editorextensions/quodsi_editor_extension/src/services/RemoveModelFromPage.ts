// RemoveModelFromPage.ts
import { PageProxy, ElementProxy } from 'lucid-extension-sdk';
import { StorageAdapter } from '../core/StorageAdapter';

export class RemoveModelFromPage {
    private storageAdapter: StorageAdapter;
    private static readonly LEGACY_KEYS = [
        'q_objecttype',
        'q_data',
        'q_status_current',
        'q_status_prior'
    ];

    constructor(private page: PageProxy) {
        this.storageAdapter = new StorageAdapter();
    }

    /**
     * Removes all model-related data from the page and its elements
     */
    public removeModel(): void {
        console.log('[RemoveModelFromPage] Starting model removal process');

        try {
            // Remove data from the page itself
            this.clearElementData(this.page);

            // Remove data from all blocks
            for (const [blockId, block] of this.page.allBlocks) {
                this.clearElementData(block);
                console.log(`[RemoveModelFromPage] Cleared data from block: ${blockId}`);
            }

            // Remove data from all lines
            for (const [lineId, line] of this.page.allLines) {
                this.clearElementData(line);
                console.log(`[RemoveModelFromPage] Cleared data from line: ${lineId}`);
            }

            console.log('[RemoveModelFromPage] Model removal completed successfully');
        } catch (error) {
            console.error('[RemoveModelFromPage] Error during model removal:', error);
            throw new Error(`Failed to remove model: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    /**
     * Verifies status-related properties were removed
     */
    private verifyStatusRemoval(element: ElementProxy): boolean {
        const statusKeys = ['q_status_current', 'q_status_prior'];
        for (const key of statusKeys) {
            const value = element.shapeData.get(key);
            if (value !== undefined && value !== '') {
                console.warn(`[RemoveModelFromPage] Status property '${key}' still exists on element ${element.id}`);
                return false;
            }
        }
        return true;
    }
}