import { PageProxy } from 'lucid-extension-sdk';
import { ModelDefinition } from '@quodsi/shared';
import { StorageAdapter } from '../core/StorageAdapter';
export declare class ModelDefinitionPageBuilder {
    private storageAdapter;
    private loggingEnabled;
    constructor(storageAdapter: StorageAdapter);
    /**
     * Method to toggle logging
     */
    setLogging(enabled: boolean): void;
    /**
     * Checks if logging is enabled
     */
    private isLoggingEnabled;
    /**
     * Logs a message if logging is enabled
     */
    private log;
    /**
     * Builds a ModelDefinition from an existing converted page
     */
    buildFromConvertedPage(page: PageProxy): ModelDefinition | null;
    /**
     * Logs a summary of the ModelDefinition contents
     */
    private logModelDefinitionSummary;
}
//# sourceMappingURL=ModelDefinitionPageBuilder.d.ts.map