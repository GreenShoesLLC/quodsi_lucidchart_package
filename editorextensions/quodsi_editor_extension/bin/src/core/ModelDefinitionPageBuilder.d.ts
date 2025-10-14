import { PageProxy } from 'lucid-extension-sdk';
import { ModelDefinition } from '@quodsi/shared';
import { StorageAdapter } from '../core/StorageAdapter';
import { LucidElementFactory } from '../services/LucidElementFactory';
export declare class ModelDefinitionPageBuilder {
    private storageAdapter;
    private elementFactory;
    private loggingEnabled;
    constructor(storageAdapter: StorageAdapter, elementFactory: LucidElementFactory);
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
     * Helper to convert serialized RequirementClause to RequirementClause instance (recursive)
     */
    private deserializeClause;
    /**
     * Loads custom resource requirements from storage and merges with automatic ones.
     *
     * Strategy:
     * - Automatic requirements (from Resource blocks) are generated on-the-fly, never persisted
     * - Custom requirements (from q_res_requirements) are persisted and can be:
     *   1. Pure custom (multi-resource like "Mixed Team Options")
     *   2. Overrides of automatic requirements (if user customizes a single-resource requirement)
     *
     * Merge logic:
     * - Custom requirements by ID override automatic ones
     * - Remaining custom requirements are added (pure custom)
     * - Result: no duplicates, custom takes precedence
     */
    private loadAndMergeResourceRequirements;
    /**
     * Loads state definitions from storage and adds them to the model definition.
     */
    private loadStates;
    /**
     * Logs a summary of the ModelDefinition contents
     */
    private logModelDefinitionSummary;
}
//# sourceMappingURL=ModelDefinitionPageBuilder.d.ts.map