import { PageProxy, BlockProxy } from 'lucid-extension-sdk';
import {
    ModelDefinition,
    SimulationObjectType,
    Resource,
    ResourceRequirement,
    RequirementClause,
    State,
    Entity,
    ArrivalPattern,
    SeasonMode,
    UnitlessSample,
    Scenario,
    SwimLaneQuodsiData,
    SwimLaneResourceData,
    ResourceFinancialProperties
} from '@quodsi/lucid-shared';
import { StorageAdapter } from '../core/StorageAdapter';
import { LucidElementFactory } from '../services/LucidElementFactory';
import { ModelLucid } from '../types/ModelLucid';
import { getLogger } from '@quodsi/lucid-shared';

const SWIMLANE_DATA_KEY = 'q_swimlane';

// Named moduleLog, not log, because this class already has a private log()
// method and an unqualified `log` inside it would be ambiguous to a reader.
const moduleLog = getLogger('ModelDefinitionPageBuilder');

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
        if (!this.isLoggingEnabled()) {
            return;
        }
        // The shared console sink prefixes [ModelDefinitionPageBuilder] itself,
        // so the template prefix this used to build by hand is gone - keeping it
        // would print the name twice.
        if (level === 'error') {
            moduleLog.error(message);
        } else if (level === 'warn') {
            moduleLog.warn(message);
        } else {
            moduleLog.debug(message);
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
            // NOTE: Entity is intentionally NOT in this list. Entities are no longer
            // shape-mapped; they are stored as a page-level list (q_entities) and loaded
            // via loadEntities() below — mirroring States / Resource Requirements.
            const processingOrder: SimulationObjectType[] = [
                SimulationObjectType.Resource,        // Process resources first to create requirements
                SimulationObjectType.Activity,        // Activities that use resources and entities
                SimulationObjectType.Generator        // Generators that reference entities
            ];

            // Before first pass, pre-initialize the map with empty arrays for expected types
            const blocksByType = new Map<SimulationObjectType, BlockProxy[]>(
                processingOrder.map(type => [type, []])
            );

            // First pass: Organize blocks by type
            for (const [blockId, block] of page.allBlocks) {
                const typeInfo = this.storageAdapter.getElementType(block);
                if (!typeInfo) {
                    this.log(`No type info found for block ${blockId}`, 'warn');
                    continue;
                }
                blocksByType.get(typeInfo.type)?.push(block);
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

            // Load entities from storage
            this.loadEntities(page, modelDefinition);

            // Load arrival patterns from storage
            this.loadArrivalPatterns(page, modelDefinition);

            // Load scenarios from storage
            this.loadScenarios(page, modelDefinition);

            // Load swimlane-derived resources
            this.loadSwimLaneResources(page, modelDefinition);

            // Process all lines (connectors)
            this.log(`Processing ${page.allLines.size} lines`);
            for (const [lineId, line] of page.allLines) {
                const typeInfo = this.storageAdapter.getElementType(line);
                if (!typeInfo || typeInfo.type !== SimulationObjectType.Connector) continue;

                try {
                    const platformObject = this.elementFactory.createPlatformObject(line, typeInfo.type);
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
     * Helper to convert serialized RequirementClause to RequirementClause instance
     * (recursive). Wire-cleanup Phase B2 Task 6/9: `clauseId` -> `id`,
     * `subClauses` -> `clauses`, `parentClauseId` DROPPED entirely
     * (round-trip-only bookkeeping — tree structure comes entirely from
     * nesting under `clauses` now).
     */
    private deserializeClause(serialized: any): RequirementClause {
        const requests = serialized.requests || [];
        const clauses = (serialized.clauses || []).map((sc: any) => this.deserializeClause(sc));

        return new RequirementClause(
            serialized.id,
            serialized.mode,
            requests, // ResourceRequest objects are plain objects, no deserialization needed
            clauses
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
                // Custom requirement overrides automatic one - deserialize the root clause
                const deserializedRootClause = this.deserializeClause(customReq.rootClause);
                mergedRequirements.push(
                    new ResourceRequirement(customReq.id, customReq.name, deserializedRootClause)
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
            // Deserialize the root clause for pure custom requirements
            const deserializedRootClause = this.deserializeClause(customReq.rootClause);
            mergedRequirements.push(
                new ResourceRequirement(customReq.id, customReq.name, deserializedRootClause)
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
     * Loads entity definitions from storage and adds them to the model definition.
     *
     * Entities are stored as a page-level list (q_entities), mirroring States.
     * The ModelDefinition constructor pre-seeds a single default entity
     * (ModelDefaults.DEFAULT_ENTITY_ID); since ComponentListManager.add keys by id
     * and overwrites on duplicate, a stored entry whose id equals the default id
     * cleanly replaces the seeded default. Other ids are added alongside.
     */
    private loadEntities(page: PageProxy, modelDefinition: ModelDefinition): void {
        this.log('Loading entities from storage');

        // Get entities from page storage
        const serializedEntities = this.storageAdapter.getEntities(page);
        this.log(`Found ${serializedEntities.length} entities in storage`);

        // Deserialize and add each entity to the model definition
        for (const serializedEntity of serializedEntities) {
            try {
                const entity = new Entity(
                    serializedEntity.id,
                    serializedEntity.name,
                    serializedEntity.x ?? 0,
                    serializedEntity.y ?? 0
                );
                entity.description = serializedEntity.description ?? '';
                modelDefinition.entities.add(entity);
                this.log(`Added entity: ${entity.name}`);
            } catch (error) {
                this.log(`Error deserializing entity: ${error}`, 'error');
            }
        }

        this.log(`Final entities count: ${modelDefinition.entities.size()}`);
    }

    /**
     * Loads arrival patterns from storage and adds them to the model definition.
     *
     * Patterns are a page-level list (q_arrival_patterns), mirroring entities
     * and states. Fields absent from storage are left at the ArrivalPattern
     * constructor's defaults — ArrivalPattern.toJSON() omits at those defaults
     * on the way out, so an absent key means "still default", not "unset".
     *
     * `seasonMode` is the one field where that rule does NOT mean "leave it
     * at the class scaffold default": ArrivalPattern's class default is
     * MONTH (a deliberate authoring-UX choice), but toJSON()'s omit rule
     * compares against WEEK, the engine's real wire default
     * (`CleanArrivalPatternDoc.season_mode`). So an absent `seasonMode` key
     * means "still WEEK", not "still MONTH" — the reader must resolve the
     * absent case to the WIRE default, not the constructor's own default,
     * or a saved WEEK pattern (52 weights) silently reads back as MONTH (12
     * weights expected) on the very next page load, corrupting the pattern
     * and failing ArrivalPatternValidation. Do not "simplify" this back to
     * `if (serialized.seasonMode !== undefined) ...` — that is the bug.
     */
    private loadArrivalPatterns(page: PageProxy, modelDefinition: ModelDefinition): void {
        this.log('Loading arrival patterns from storage');

        const serializedPatterns = this.storageAdapter.getArrivalPatterns(page);
        this.log(`Found ${serializedPatterns.length} arrival patterns in storage`);

        for (const serialized of serializedPatterns) {
            try {
                const pattern = new ArrivalPattern(serialized.id, serialized.name);
                if (serialized.cycle !== undefined) pattern.cycle = serialized.cycle as any;
                // Wire default (WEEK), not the class default (MONTH) — see the
                // method doc comment above for why these two differ.
                pattern.seasonMode = SeasonMode.WEEK;
                if (serialized.seasonMode !== undefined) pattern.seasonMode = serialized.seasonMode as any;
                if (serialized.countMode !== undefined) pattern.countMode = serialized.countMode as any;
                if (serialized.seasonWeights !== undefined) pattern.seasonWeights = serialized.seasonWeights;
                if (serialized.dayOfWeekWeights !== undefined) pattern.dayOfWeekWeights = serialized.dayOfWeekWeights;
                if (serialized.hourWeights !== undefined) pattern.hourWeights = serialized.hourWeights;
                if (serialized.withinHourOffset !== undefined) {
                    pattern.withinHourOffset = UnitlessSample.fromJSON(serialized.withinHourOffset);
                }
                modelDefinition.arrivalPatterns.add(pattern);
                this.log(`Added arrival pattern: ${pattern.name}`);
            } catch (error) {
                this.log(`Error deserializing arrival pattern: ${error}`, 'error');
            }
        }

        this.log(`Final arrival patterns count: ${modelDefinition.arrivalPatterns.size()}`);
    }

    /**
     * Loads scenarios from storage and adds them to the model definition.
     */
    private loadScenarios(page: PageProxy, modelDefinition: ModelDefinition): void {
        this.log('Loading scenarios from storage');

        const serializedScenarios = this.storageAdapter.getScenarios(page);
        this.log(`Found ${serializedScenarios.length} scenarios in storage`);

        for (const serializedScenario of serializedScenarios) {
            try {
                const scenario = Scenario.fromJSON(serializedScenario);
                modelDefinition.scenarios.add(scenario);
                this.log(`Added scenario: ${scenario.name}`);
            } catch (error) {
                this.log(`Error deserializing scenario: ${error}`, 'error');
            }
        }

        this.log(`Final scenarios count: ${modelDefinition.scenarios.size()}`);
    }

    /**
     * Loads Resources defined inline in swimlane lane mappings.
     */
    private loadSwimLaneResources(page: PageProxy, modelDefinition: ModelDefinition): void {
        this.log('Loading swimlane-derived resources');
        let addedCount = 0;

        for (const [blockId, block] of page.allBlocks) {
            if (block.getClassName() !== 'AdvancedSwimLaneBlock') continue;

            const dataStr = block.shapeData.get(SWIMLANE_DATA_KEY);
            if (!dataStr) {
                this.log(`Swimlane ${blockId} has no q_swimlane data`);
                continue;
            }

            let swimlaneData: SwimLaneQuodsiData;
            try {
                swimlaneData = JSON.parse(dataStr as string);
            } catch (error) {
                this.log(`Error parsing q_swimlane for block ${blockId}: ${error}`, 'error');
                continue;
            }

            for (const mapping of swimlaneData.lanes) {
                if (!mapping) continue;

                const resData: SwimLaneResourceData = mapping.resource;

                // Skip if a Resource with this ID already exists
                const existing = modelDefinition.resources.getAll().find(r => r.id === resData.id);
                if (existing) {
                    this.log(`Swimlane resource ${resData.id} already exists in model, skipping`);
                    continue;
                }

                // Create Resource from inline data
                const resource = new Resource(
                    resData.id,
                    resData.name,
                    resData.capacity,
                    0, // x — no canvas position for lane-derived resources
                    0  // y
                );
                resource.description = resData.description || '';

                if (resData.financialProperties) {
                    resource.financialProperties = new ResourceFinancialProperties({
                        enabled: resData.financialProperties.enabled,
                        costPerSeize: resData.financialProperties.costPerSeize,
                        costPerHourUtilized: resData.financialProperties.costPerHourUtilized,
                        costPerHourIdle: resData.financialProperties.costPerHourIdle,
                    });
                }

                modelDefinition.resources.add(resource);

                // Create a default single-resource requirement
                const requirement = ResourceRequirement.createForSingleResource(resource);
                modelDefinition.resourceRequirements.add(requirement);

                this.log(`Added swimlane resource: ${resource.name} (lane: ${mapping.titleSnapshot})`);
                addedCount++;
            }
        }

        this.log(`Loaded ${addedCount} swimlane-derived resources`);
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