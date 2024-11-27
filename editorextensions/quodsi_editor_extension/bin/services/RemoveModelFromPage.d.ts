import { PageProxy } from 'lucid-extension-sdk';
export declare class RemoveModelFromPage {
    private page;
    private storageAdapter;
    private static readonly LEGACY_KEYS;
    constructor(page: PageProxy);
    /**
     * Removes all model-related data from the page and its elements
     */
    removeModel(): void;
    /**
     * Clears all model-related data from an element
     */
    private clearElementData;
    /**
     * Clears legacy data properties (q_objecttype and q_data)
     */
    private clearLegacyData;
    /**
     * Verifies status-related properties were removed
     */
    private verifyStatusRemoval;
}
