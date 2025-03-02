import { PageProxy, ElementProxy, BlockProxy } from 'lucid-extension-sdk';
import {
    Model,
    ModelDefinition,
    SimulationObjectType,
    Activity,
    Generator,
    Resource,
    Connector,
    Entity,
    ResourceRequirement
} from '@quodsi/shared';
import { StorageAdapter } from '../core/StorageAdapter';
import { LucidElementFactory } from '../services/LucidElementFactory';
import { ModelLucid } from '../types/ModelLucid';

export class ModelDefinitionPageBuilder {
    private loggingEnabled: boolean = true;

    constructor(
        private storageAdapter: StorageAdapter,
        private elementFactory: LucidElementFactory) { }

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
            // First validate that we have a valid page
            if (!page) {
                this.log('Page is undefined', 'error');
                return null;
            }

            // Log page details
            this.log('Page details:', 'log');
            this.log(JSON.stringify({
                pageExists: !!page,
                pageId: page.id,
                pageTitle: page.getTitle?.(),
                hasAllBlocks: 'allBlocks' in page,
                hasGetTitle: 'getTitle' in page,
                constructor: page.constructor.name
            }));
            this.log(`Starting model definition build for page ${page.id}`);
            // Add explicit type check before creating ModelLucid
            if (!this.elementFactory.isPageProxy(page)) {
                this.log('Invalid page proxy provided', 'error');
                return null;
            }

            // Create ModelLucid using the element factory
            let modelLucid;
            try {
                modelLucid = this.elementFactory.createPlatformObject(page, SimulationObjectType.Model) as ModelLucid;
                if (!modelLucid) {
                    this.log('Failed to create ModelLucid', 'error');
                    return null;
                }
            } catch (error) {
                this.log(`Error creating ModelLucid: ${error instanceof Error ? error.message : String(error)}`, 'error');
                if (error instanceof Error && error.stack) {
                    this.log(`Stack trace: ${error.stack}`, 'error');
                }
                return null;
            }

            let modelData;
            try {
                modelData = modelLucid.getSimulationObject();
                if (!modelData) {
                    this.log('Model data is undefined', 'error');
                    return null;
                }
            } catch (error) {
                this.log(`Error getting simulation object: ${error instanceof Error ? error.message : String(error)}`, 'error');
                return null;
            }

            // Create initial ModelDefinition
            const modelDefinition = new ModelDefinition(modelData);

            // Validate ModelDefinition initialization
            const requiredManagers = [
                'activities',
                'connectors',
                'resources',
                'resourceRequirements',
                'generators',
                'entities'
            ] as const;

            const managerKeys = requiredManagers;
            for (const key of managerKeys) {
                const manager = modelDefinition[key];
                if (!manager || typeof manager.add !== 'function') {
                    this.log(`ModelDefinition ${key} not properly initialized`, 'error');
                    return null;
                }
            }
            const processingOrder: SimulationObjectType[] = [
                SimulationObjectType.Resource,        // Process resources first to create requirements
                SimulationObjectType.Entity,          // Then entities as they might be referenced
                SimulationObjectType.Activity,        // Activities that use resources and entities
                SimulationObjectType.Generator        // Generators that reference entities
            ];

            // Before first pass, pre-initialize the map with empty arrays for expected types
            const blocksByType = new Map<SimulationObjectType, BlockProxy[]>(
                processingOrder.map(type => [type, []])
            );

            // First pass: Organize blocks by type
            for (const [blockId, block] of page.allBlocks) {
                const metadata = this.storageAdapter.getMetadata(block);
                if (!metadata) {
                    this.log(`No metadata found for block ${blockId}`, 'warn');
                    continue;
                }
                blocksByType.get(metadata.type)?.push(block);
            }
            // Process types in dependency order

            // Process each type in order
            for (const type of processingOrder) {
                const blocks = blocksByType.get(type) || [];
                this.log(`Processing ${blocks.length} blocks of type ${type}`);

                for (const block of blocks) {
                    try {
                        const platformObject = this.elementFactory.createPlatformObject(block, type);
                        const simObject = platformObject.getSimulationObject();

                        switch (type) {
                            case SimulationObjectType.Resource:
                                modelDefinition.resources.add(simObject);
                                const requirement = ResourceRequirement.createForSingleResource(simObject);
                                modelDefinition.resourceRequirements.add(requirement);
                                this.log(`Added resource and requirement: ${simObject.name}`);
                                break;

                            case SimulationObjectType.Activity:
                                modelDefinition.activities.add(simObject);
                                this.log(`Added activity: ${simObject.name}`);
                                break;

                            case SimulationObjectType.Generator:
                                modelDefinition.generators.add(simObject);
                                this.log(`Added generator: ${simObject.name}`);
                                break;

                            case SimulationObjectType.Entity:
                                modelDefinition.entities.add(simObject);
                                this.log(`Added entity: ${simObject.name}`);
                                break;
                        }
                    } catch (error) {
                        this.log(`Error processing block of type ${type}: ${error}`, 'error');
                    }
                }
            }

            // Process all lines (connectors)
            this.log(`Processing ${page.allLines.size} lines`);
            for (const [lineId, line] of page.allLines) {
                const metadata = this.storageAdapter.getMetadata(line);
                if (!metadata || metadata.type !== SimulationObjectType.Connector) continue;

                try {
                    const platformObject = this.elementFactory.createPlatformObject(line, metadata.type);
                    const connector = platformObject.getSimulationObject();

                    // Skip adding self-referencing connectors
                    if (connector.sourceId && connector.targetId && connector.sourceId === connector.targetId) {
                        this.log(`Skipping self-referencing connector from ${connector.sourceId} to itself`, 'warn');
                        continue;
                    }

                    modelDefinition.connectors.add(connector);
                } catch (error) {
                    this.log(`Error processing line ${lineId}`, 'error');
                }
            }

            // Log summary with more detail
            this.logModelDefinitionSummary(modelDefinition);

            return modelDefinition;

        } catch (error) {
            this.log(`Error building ModelDefinition: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            if (error instanceof Error) {
                this.log(`Error stack: ${error.stack}`, 'error');
            }
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

        // Log activities with names
        const activities = modelDefinition.activities.getAll();
        this.log(`- Activities: ${activities.length}`);
        activities.forEach((activity, index) => {
            this.log(`  ${index + 1}. ${activity.name}`);
        });

        this.log(`- Generators: ${modelDefinition.generators.size()}`);
        this.log(`- Resources: ${modelDefinition.resources.size()}`);
        this.log(`- Requirements: ${modelDefinition.resourceRequirements.size()}`);
        this.log(`- Entities: ${modelDefinition.entities.size()}`);
        this.log(`- Connectors: ${modelDefinition.connectors.size()}`);
    }
}