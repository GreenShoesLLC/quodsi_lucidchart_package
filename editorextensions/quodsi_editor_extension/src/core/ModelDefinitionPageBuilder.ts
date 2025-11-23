import { PageProxy, BlockProxy } from 'lucid-extension-sdk';
import {
    ModelDefinition,
    SimulationObjectType,
    ResourceRequirement,
    RequirementClause,
    State,
    TimePattern,
    TimeDistributedConfig,
    Duration,
    VolumePeriodBasis
} from '@quodsi/shared';
import { StorageAdapter } from '../core/StorageAdapter';
import { LucidElementFactory } from '../services/LucidElementFactory';
import { ModelLucid } from '../types/ModelLucid';

export class ModelDefinitionPageBuilder {
    private loggingEnabled: boolean = false;

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

            // Load and merge custom resource requirements from storage
            this.loadAndMergeResourceRequirements(page, modelDefinition);

            // Load states from storage
            this.loadStates(page, modelDefinition);

            // Load time patterns from storage
            this.loadTimePatterns(page, modelDefinition);

            // Load time distributed configs from storage
            this.loadTimeDistributedConfigs(page, modelDefinition);

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
     * Helper to convert serialized RequirementClause to RequirementClause instance (recursive)
     */
    private deserializeClause(serialized: any): RequirementClause {
        const requests = serialized.requests || [];
        const subClauses = (serialized.subClauses || []).map((sc: any) => this.deserializeClause(sc));

        return new RequirementClause(
            serialized.clauseId,
            serialized.mode,
            serialized.parentClauseId,
            requests, // ResourceRequest objects are plain objects, no deserialization needed
            subClauses
        );
    }

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
    private loadAndMergeResourceRequirements(
        page: PageProxy,
        modelDefinition: ModelDefinition
    ): void {
        this.log('Loading and merging resource requirements');

        // Get automatic requirements already added (one per Resource block)
        const autoRequirements = modelDefinition.resourceRequirements.getAll();
        this.log(`Automatic requirements from Resource blocks: ${autoRequirements.length}`);

        // Load custom requirements from storage
        const customRequirements = this.storageAdapter.getResourceRequirements(page);
        this.log(`Custom requirements from storage: ${customRequirements.length}`);

        // Create a map of custom requirements by ID for fast lookup
        const customById = new Map(customRequirements.map(r => [r.id, r]));

        // Merge: custom overrides auto by matching ID
        const mergedRequirements: ResourceRequirement[] = [];

        for (const autoReq of autoRequirements) {
            const customReq = customById.get(autoReq.id);
            if (customReq) {
                // Custom requirement overrides automatic one - deserialize clauses
                const deserializedClauses = customReq.rootClauses.map(c => this.deserializeClause(c));
                mergedRequirements.push(
                    new ResourceRequirement(customReq.id, customReq.name, deserializedClauses)
                );
                customById.delete(autoReq.id); // Mark as processed
                this.log(`Using custom requirement for resource: ${customReq.name} (ID: ${autoReq.id})`);
            } else {
                // Keep automatic requirement
                mergedRequirements.push(autoReq);
            }
        }

        // Add remaining custom requirements (pure custom, not tied to a single resource)
        for (const [id, customReq] of customById) {
            // Deserialize clauses for pure custom requirements
            const deserializedClauses = customReq.rootClauses.map(c => this.deserializeClause(c));
            mergedRequirements.push(
                new ResourceRequirement(customReq.id, customReq.name, deserializedClauses)
            );
            this.log(`Adding pure custom requirement: ${customReq.name} (ID: ${id})`);
        }

        // Clear and repopulate the requirements manager with merged result
        modelDefinition.resourceRequirements.clear();
        for (const req of mergedRequirements) {
            modelDefinition.resourceRequirements.add(req);
        }

        this.log(`Final merged requirements count: ${mergedRequirements.length}`);
    }

    /**
     * Loads state definitions from storage and adds them to the model definition.
     */
    private loadStates(page: PageProxy, modelDefinition: ModelDefinition): void {
        this.log('Loading states from storage');

        // Get states from page storage
        const serializedStates = this.storageAdapter.getStates(page);
        this.log(`Found ${serializedStates.length} states in storage`);

        // Deserialize and add each state to the model definition
        for (const serializedState of serializedStates) {
            try {
                const state = State.fromJSON(serializedState);
                modelDefinition.states.add(state);
                this.log(`Added state: ${state.name} (${state.componentType})`);
            } catch (error) {
                this.log(`Error deserializing state: ${error}`, 'error');
            }
        }

        this.log(`Final states count: ${modelDefinition.states.size()}`);
    }

    /**
     * Loads time patterns from storage and adds them to the model definition.
     */
    private loadTimePatterns(page: PageProxy, modelDefinition: ModelDefinition): void {
        this.log('Loading time patterns from storage');

        // Get time patterns from page storage
        const serializedPatterns = this.storageAdapter.getTimePatterns(page);
        this.log(`Found ${serializedPatterns.length} time patterns in storage`);

        // Deserialize and add each time pattern to the model definition
        for (const serializedPattern of serializedPatterns) {
            try {
                const pattern = new TimePattern(
                    serializedPattern.unique_id,
                    serializedPattern.name
                );

                // Set optional weight arrays
                if (serializedPattern.weeklyWeights) {
                    pattern.weeklyWeights = serializedPattern.weeklyWeights;
                }
                if (serializedPattern.dayOfWeekWeights) {
                    pattern.dayOfWeekWeights = serializedPattern.dayOfWeekWeights;
                }
                if (serializedPattern.dayOfWeekHourWeights) {
                    pattern.dayOfWeekHourWeights = serializedPattern.dayOfWeekHourWeights;
                }

                // Deserialize Duration for minute distribution
                if (serializedPattern.minuteDistributionDef) {
                    const dist = serializedPattern.minuteDistributionDef;
                    pattern.minuteDistribution = new Duration(
                        dist.durationPeriodUnit,
                        dist.distribution || undefined
                    );
                }

                modelDefinition.timePatterns.add(pattern);
                this.log(`Added time pattern: ${pattern.name}`);
            } catch (error) {
                this.log(`Error deserializing time pattern: ${error}`, 'error');
            }
        }

        this.log(`Final time patterns count: ${modelDefinition.timePatterns.size()}`);
    }

    /**
     * Loads time distributed configs from storage and adds them to the model definition.
     */
    private loadTimeDistributedConfigs(page: PageProxy, modelDefinition: ModelDefinition): void {
        this.log('Loading time distributed configs from storage');

        // Get time distributed configs from page storage
        const serializedConfigs = this.storageAdapter.getTimeDistributedConfigs(page);
        this.log(`Found ${serializedConfigs.length} time distributed configs in storage`);

        // Deserialize and add each config to the model definition
        for (const serializedConfig of serializedConfigs) {
            try {
                const config = new TimeDistributedConfig(
                    serializedConfig.unique_id,
                    serializedConfig.name
                );

                config.timePatternId = serializedConfig.timePatternId;
                config.totalVolume = serializedConfig.totalVolume;
                config.volumePeriodBasis = serializedConfig.volumePeriodBasis as VolumePeriodBasis;
                config.startDate = serializedConfig.startDate;
                config.endDate = serializedConfig.endDate;

                modelDefinition.timeDistributedConfigs.add(config);
                this.log(`Added time distributed config: ${config.name}`);
            } catch (error) {
                this.log(`Error deserializing time distributed config: ${error}`, 'error');
            }
        }

        this.log(`Final time distributed configs count: ${modelDefinition.timeDistributedConfigs.size()}`);
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