import { PageProxy } from 'lucid-extension-sdk';
import { ConversionResult } from '@quodsi/shared';
import { ModelManager } from '../../core/ModelManager';
export declare class ConversionService {
    private modelManager;
    private storageAdapter;
    constructor(modelManager: ModelManager);
    /**
     * Checks if a page can be converted to a model
     */
    canConvertPage(page: PageProxy): boolean;
    /**
     * Converts a LucidChart page to a Quodsi simulation model
     */
    convertPage(page: PageProxy): Promise<ConversionResult>;
    /**
     * Analyzes the page structure
     */
    private analyzePage;
    /**
     * Initializes the model data on the page
     */
    private initializeModel;
    /**
     * Converts blocks to simulation elements
     */
    private convertBlocks;
    /**
     * Converts connections to simulation connectors
     */
    private convertConnections;
    /**
     * Updates block analysis with connection information
     */
    private updateBlockAnalysis;
    /**
     * Determines element types based on connection patterns
     */
    private blockSpecificLogic;
    /**
     * Determines element types based on connection patterns
     */
    private determineElementTypes;
    /**
     * Gets a suitable name for a block
     */
    private getBlockName;
}
//# sourceMappingURL=ConversionService.d.ts.map