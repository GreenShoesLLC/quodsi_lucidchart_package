import { PageProxy, ElementProxy } from 'lucid-extension-sdk';
import {
    Model,
    ModelDefinition,
    SimulationObjectType,
    Activity,
    Generator,
    Resource,
    Connector,
    Entity
} from '@quodsi/shared';
import { StorageAdapter } from '../core/StorageAdapter';

export class ModelDefinitionPageBuilder {
    private loggingEnabled: boolean = false;

    constructor(private storageAdapter: StorageAdapter) { }

    /**
     * Method to toggle logging
     */
    public setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
        this.log(`Logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Checks if logging is enabled
     */
    private isLoggingEnabled(): boolean {
        return this.loggingEnabled;
    }

    /**
     * Logs a message if logging is enabled
     */
    private log(message: string, level: 'log' | 'warn' | 'error' = 'log'): void {
        if (this.isLoggingEnabled()) {
            console[level](`[${this.constructor.name}] ${message}`);
        }
    }

    /**
     * Builds a ModelDefinition from an existing converted page
     */
    public buildFromConvertedPage(page: PageProxy): ModelDefinition | null {
        try {
            this.log(`Starting model definition build for page ${page.id}`);
            this.log(`Page title: ${page.getTitle()}`);

            // Get the model data from the page
            const modelData = this.storageAdapter.getElementData<Model>(page);
            if (!modelData) {
                this.log('No model data found on page', 'error');
                return null;
            }
            this.log(`Found model data with ID: ${modelData.id}`);

            // Create initial ModelDefinition
            const modelDefinition = new ModelDefinition(modelData);
            // Verify the critical functions exist
            if (!modelDefinition.activities || typeof modelDefinition.activities.add !== 'function') {
                this.log('ModelDefinition activities not properly initialized', 'error');
                return null;
            }
            if (!modelDefinition.connectors || typeof modelDefinition.connectors.add !== 'function') {
                this.log('ModelDefinition connectors not properly initialized', 'error');
                return null;
            }
            if (!modelDefinition.resources || typeof modelDefinition.resources.add !== 'function') {
                this.log('ModelDefinition resources not properly initialized', 'error');
                return null;
            }
            if (!modelDefinition.generators || typeof modelDefinition.generators.add !== 'function') {
                this.log('ModelDefinition generators not properly initialized', 'error');
                return null;
            }
            if (!modelDefinition.entities || typeof modelDefinition.entities.add !== 'function') {
                this.log('ModelDefinition entities not properly initialized', 'error');
                return null;
            }

            // Process all blocks (shapes)
            this.log(`Processing ${page.allBlocks.size} blocks`);
            for (const [blockId, block] of page.allBlocks) {
                this.log(`Processing block ${blockId}`);

                const elementData = this.storageAdapter.getElementData(block);
                const metadata = this.storageAdapter.getMetadata(block);

                if (!elementData || !metadata) {
                    this.log(`Missing data or metadata for block ${blockId}`, 'warn');
                    continue;
                }

                try {
                    this.log(`Block ${blockId} type: ${metadata.type}`);
                    switch (metadata.type) {
                        case SimulationObjectType.Activity:
                            modelDefinition.activities.add(elementData as Activity);
                            this.log(`Added activity ${blockId}`);
                            break;
                        case SimulationObjectType.Generator:
                            modelDefinition.generators.add(elementData as Generator);
                            this.log(`Added generator ${blockId}`);
                            break;
                        case SimulationObjectType.Resource:
                            modelDefinition.resources.add(elementData as Resource);
                            this.log(`Added resource ${blockId}`);
                            break;
                        case SimulationObjectType.Entity:
                            modelDefinition.entities.add(elementData as Entity);
                            this.log(`Added entity ${blockId}`);
                            break;
                        default:
                            this.log(`Unknown type ${metadata.type} for block ${blockId}`, 'warn');
                    }
                } catch (error) {
                    this.log(`Error adding ${metadata.type} ${blockId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                }
            }

            // Process all lines (connectors)
            this.log(`Processing ${page.allLines.size} lines`);
            for (const [lineId, line] of page.allLines) {
                this.log(`Processing line ${lineId}`);

                const connectorData = this.storageAdapter.getElementData<Connector>(line);
                const metadata = this.storageAdapter.getMetadata(line);

                if (!connectorData || !metadata) {
                    this.log(`Missing data or metadata for line ${lineId}`, 'warn');
                    continue;
                }

                if (metadata.type === SimulationObjectType.Connector) {
                    try {
                        modelDefinition.connectors.add(connectorData);
                        this.log(`Added connector ${lineId} from ${connectorData.sourceId} to ${connectorData.targetId}`);
                    } catch (error) {
                        this.log(`Error adding connector ${lineId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                    }
                } else {
                    this.log(`Unexpected type ${metadata.type} for line ${lineId}`, 'warn');
                }
            }

            // Log summary
            this.logModelDefinitionSummary(modelDefinition);

            return modelDefinition;

        } catch (error) {
            this.log(`Error building ModelDefinition: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            return null;
        }
    }

    /**
     * Logs a summary of the ModelDefinition contents
     */
    private logModelDefinitionSummary(modelDefinition: ModelDefinition): void {
        if (!this.isLoggingEnabled()) return;

        this.log('Model Definition Summary:');
        this.log(`- Model ID: ${modelDefinition.id}`);
        this.log(`- Model Name: ${modelDefinition.name}`);
        this.log(`- Activities: ${modelDefinition.activities.size()}`);
        this.log(`- Generators: ${modelDefinition.generators.size()}`);
        this.log(`- Resources: ${modelDefinition.resources.size()}`);
        this.log(`- Entities: ${modelDefinition.entities.size()}`);
        this.log(`- Connectors: ${modelDefinition.connectors.size()}`);
    }
}