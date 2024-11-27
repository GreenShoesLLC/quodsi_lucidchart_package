import { PageProxy } from 'lucid-extension-sdk';
import { ConversionResult } from '../../shared/types/ConversionResult';
import { StorageAdapter } from '../../core/StorageAdapter';
import { ModelManager } from '../../core/ModelManager';
/**
 * Handles the conversion of LucidChart diagrams to Quodsi simulation models
 */
export declare class ConversionService {
    private modelManager;
    private storageAdapter;
    private elements;
    private activityRelationships;
    private connections;
    constructor(modelManager: ModelManager, storageAdapter: StorageAdapter);
    /**
     * Checks if a page can be converted to a model
     */
    canConvertPage(page: PageProxy): boolean;
    /**
     * Converts a LucidChart page to a Quodsi simulation model
     */
    convertPage(page: PageProxy): Promise<ConversionResult>;
    /**
     * Analyzes the page structure to determine element types and relationships
     */
    private analyzePage;
    /**
     * Initializes the model data on the page
     */
    private initializeModel;
    /**
     * Converts blocks based on analysis
     */
    private convertBlocks;
    /**
     * Converts individual block to simulation element
     */
    private convertBlock;
    /**
     * Converts connections to simulation connectors
     */
    private convertConnections;
    /**
     * Updates block analysis with connection information
     */
    private updateBlockAnalysis;
    /**
     * Records connection information
     */
    private recordConnection;
    /**
     * Determines element types based on connection patterns
     */
    private determineElementTypes;
    private determineElementTypeFromAnalysis;
    /**
     * Calculates probability for a connection based on source block's outgoing connections
     */
    private calculateProbability;
    /**
     * Creates base element data for a block
     */
    private createElementData;
    /**
     * Gets a suitable name for a block
     */
    private getBlockName;
    /**
     * Generates a unique identifier
     */
    private generateId;
    private createConnectorElement;
    /**
     * Assigns resources to activities
     */
    private assignResourcesToActivities;
}
