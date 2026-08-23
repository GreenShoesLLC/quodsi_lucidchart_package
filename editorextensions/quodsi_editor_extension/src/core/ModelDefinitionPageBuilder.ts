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
    ArrivalSchedule,
    SeasonMode,
    UnitlessSample,
    Scenario,
    SwimLaneQuodsiData,
    ResourceFinancialProperties,
    ResourceClaim,
    ResourceLaneRef,
    ResourceLinkRejection,
    resolveResourceLinks,
    reconcileAutoRequirements
} from '@quodsi/lucid-shared';
import { StorageAdapter } from '../core/StorageAdapter';
import { LucidElementFactory } from '../services/LucidElementFactory';
import { ModelLucid } from '../types/ModelLucid';
import { SimObjectLucid } from '../types/SimObjectLucid';
import { getLogger } from '@quodsi/lucid-shared';

const SWIMLANE_DATA_KEY = 'q_swimlane';

// Named moduleLog, not log, because this class already has a private log()
// method and an unqualified `log` inside it would be ambiguous to a reader.
const moduleLog = getLogger('ModelDefinitionPageBuilder');

export class ModelDefinitionPageBuilder {
    private loggingEnabled: boolean = false;

    private lastResourceLinkRejections: ResourceLinkRejection[] = [];
    /** Claims the last build rejected (dangling / duplicate). ModelManager.validateModel turns these into WARNINGs. */
    public getLastResourceLinkRejections(): ResourceLinkRejection[] { return this.lastResourceLinkRejections; }

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
            // Resources come from the page-level q_resources list, ahead of every
            // block, so the claim walk below has something to link blocks and lanes to.
            this.loadResources(page, modelDefinition);

            // NOTE: Entity is intentionally NOT in this list. Entities are no longer
            // shape-mapped; they are stored as a page-level list (q_entities) and loaded
            // via loadEntities() below — mirroring States / Resource Requirements.
            // Resource is NOT in this list either (storage format 2): a Resource block
            // is a POINTER at a model-level record, never the record itself, so it is
            // handled by linkResourceClaimants() instead of being minted here.
            const processingOrder: SimulationObjectType[] = [
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

            // Link blocks and swimlane lanes to the resources they claim (needs
            // both the loaded Resource objects and the block pass to have run).
            this.linkResourceClaimants(page, modelDefinition);

            // Derive/reconcile resource requirements against those resources
            this.loadResourceRequirements(page, modelDefinition);

            // Load states from storage
            this.loadStates(page, modelDefinition);

            // Load entities from storage
            this.loadEntities(page, modelDefinition);

            // Load arrival patterns from storage
            this.loadArrivalPatterns(page, modelDefinition);

            // Load arrival schedules from storage
            this.loadArrivalSchedules(page, modelDefinition);

            // Load scenarios from storage
            this.loadScenarios(page, modelDefinition);

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
     * Loads the page-level Resource list (`q_resources`, storage format 2).
     *
     * Resources are model-level records, not shape data: they exist whether or
     * not anything on the canvas draws them. Geometry is deliberately NOT read
     * here - it follows whichever block claims the resource, stamped by
     * linkResourceClaimants() below. A resource nothing claims (a lane
     * resource, or one authored from the Resources tab) simply stays at 0/0
     * with no width/height, which Resource.toJSON() omits.
     */
    private loadResources(page: PageProxy, modelDefinition: ModelDefinition): void {
        for (const stored of this.storageAdapter.getResources(page)) {
            try {
                const resource = new Resource(String(stored.id), stored.name || 'New Resource', stored.capacity ?? 1);
                resource.description = stored.description ?? '';
                if (stored.financialProperties) {
                    resource.financialProperties = new ResourceFinancialProperties({
                        enabled: stored.financialProperties.enabled,
                        costPerSeize: stored.financialProperties.costPerSeize,
                        costPerHourUtilized: stored.financialProperties.costPerHourUtilized,
                        costPerHourIdle: stored.financialProperties.costPerHourIdle,
                    });
                }
                if (Array.isArray(stored.levers)) resource.levers = stored.levers;
                modelDefinition.resources.add(resource);
            } catch (error) {
                this.log(`Error deserializing resource ${stored?.id}: ${error}`, 'error');
            }
        }
        this.log(`Final resources count: ${modelDefinition.resources.size()}`);
    }

    /**
     * Stamps the TRANSIENT claimant markers (`shapeId` / `shapeLabel` /
     * `laneRef`) and the geometry onto the resources something on the canvas
     * claims.
     *
     * Claims are collected in DOCUMENT ORDER - `page.allBlocks` order, and
     * within a swimlane block, lane order - because that order is
     * resolveResourceLinks' tie-break when two claimants name one resource,
     * and it is the only thing that makes the winner stable across reloads.
     *
     * Rejections are not errors: the claimant just renders unlinked. They are
     * kept on `lastResourceLinkRejections` for validation to surface.
     */
    private linkResourceClaimants(page: PageProxy, modelDefinition: ModelDefinition): void {
        type Claimant = { claim: ResourceClaim; block: BlockProxy };
        const claimants: Claimant[] = [];
        for (const [blockId, block] of page.allBlocks) {
            const typeInfo = this.storageAdapter.getElementType(block);
            if (typeInfo?.type === SimulationObjectType.Resource) {
                const ptr = this.storageAdapter.getElementData(block) as { resourceId?: string } | null;
                if (ptr?.resourceId) {
                    claimants.push({ block, claim: { kind: 'shape', claimantId: blockId, resourceId: String(ptr.resourceId) } });
                }
            }
            if (block.getClassName() === 'AdvancedSwimLaneBlock') {
                const str = block.shapeData.get(SWIMLANE_DATA_KEY) as string | undefined;
                if (str) {
                    try {
                        const swim = JSON.parse(str) as SwimLaneQuodsiData;
                        for (const lane of swim.lanes ?? []) {
                            if (lane?.resourceId) {
                                claimants.push({
                                    block,
                                    claim: {
                                        kind: 'lane',
                                        claimantId: `${blockId}:${lane.laneId}`,
                                        resourceId: String(lane.resourceId),
                                        laneRef: { blockId, laneId: lane.laneId }
                                    }
                                });
                            }
                        }
                    } catch (error) { this.log(`Bad q_swimlane on ${blockId}: ${error}`, 'warn'); }
                }
            }
        }
        const resolution = resolveResourceLinks(
            modelDefinition.resources.getAll().map(r => r.id),
            claimants.map(c => c.claim)
        );
        const byClaimantId = new Map(claimants.map(c => [c.claim.claimantId, c]));
        for (const [resourceId, claim] of resolution.claimByResourceId) {
            const resource = modelDefinition.resources.get(resourceId) as (Resource & { shapeId?: string; shapeLabel?: string; laneRef?: ResourceLaneRef }) | undefined;
            const claimant = byClaimantId.get(claim.claimantId);
            if (!resource || !claimant) continue;
            if (claim.kind === 'shape') {
                const box = claimant.block.getBoundingBox();
                resource.setLocation(box.x ?? 0, box.y ?? 0);
                resource.width = box.w;
                resource.height = box.h;
                resource.shapeId = claim.claimantId;
                resource.shapeLabel = SimObjectLucid.blockLabel(claimant.block);
            } else {
                resource.laneRef = claim.laneRef;
            }
        }
        this.lastResourceLinkRejections = resolution.rejected;
        if (resolution.rejected.length) {
            this.log(`Rejected ${resolution.rejected.length} resource claim(s)`, 'warn');
        }
    }

    /**
     * Builds the requirement list from storage through the SHARED reconcile
     * chokepoint (`reconcileAutoRequirements`).
     *
     * It keeps every stored entry - pure custom ones, and user overrides
     * stored under an auto id - drops an auto-shaped entry whose resource is
     * gone, renames an auto-shaped entry to its resource's current name, and
     * appends a fresh auto for every resource still lacking one. That is the
     * old block-pass mint + lane-pass mint + custom merge, in one place that
     * drawio and Visio run too.
     */
    private loadResourceRequirements(page: PageProxy, modelDefinition: ModelDefinition): void {
        this.log('Loading resource requirements');

        const stored = this.storageAdapter.getResourceRequirements(page) as unknown as Array<Record<string, unknown>>;
        const reconciled = reconcileAutoRequirements(modelDefinition.resources.getAll(), stored);

        modelDefinition.resourceRequirements.clear();
        for (const raw of reconciled) {
            try {
                // The same deserializer the old merge used: a stored rootClause
                // is plain JSON and must become a RequirementClause instance
                // (recursively) before it enters the model.
                const rootClause = this.deserializeClause(raw.rootClause);
                modelDefinition.resourceRequirements.add(
                    new ResourceRequirement(String(raw.id), String(raw.name ?? ''), rootClause)
                );
            } catch (error) {
                this.log(`Error deserializing resource requirement ${raw?.id}: ${error}`, 'error');
            }
        }

        this.log(`Final requirements count: ${modelDefinition.resourceRequirements.size()}`);
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
     * Loads arrival schedules from storage and adds them to the model definition.
     *
     * Schedules are a page-level list (q_arrival_schedules), mirroring
     * arrival patterns. Fields absent from storage are left at the
     * ArrivalSchedule constructor's defaults — ArrivalSchedule.toJSON()
     * omits at those defaults on the way out, so an absent key means "still
     * default", not "unset". Unlike ArrivalPattern's seasonMode, there is no
     * class-default / wire-omit-rule divergence here: `timeUnit`'s class
     * default and toJSON() omit value are both PeriodUnit.MINUTES, and
     * `arrivals`' default/omit value are both []. So no wire-default
     * override is needed — leaving fields untouched when absent already
     * resolves to the correct value. `source` is never restored: toJSON()
     * drops it unconditionally, so the constructor default stands.
     */
    private loadArrivalSchedules(page: PageProxy, modelDefinition: ModelDefinition): void {
        this.log('Loading arrival schedules from storage');

        const serializedSchedules = this.storageAdapter.getArrivalSchedules(page);
        this.log(`Found ${serializedSchedules.length} arrival schedules in storage`);

        for (const serialized of serializedSchedules) {
            try {
                const schedule = new ArrivalSchedule(serialized.id, serialized.name);
                if (serialized.timeUnit !== undefined) schedule.timeUnit = serialized.timeUnit as any;
                if (serialized.arrivals !== undefined) schedule.arrivals = serialized.arrivals;
                modelDefinition.arrivalSchedules.add(schedule);
                this.log(`Added arrival schedule: ${schedule.name}`);
            } catch (error) {
                this.log(`Error deserializing arrival schedule: ${error}`, 'error');
            }
        }

        this.log(`Final arrival schedules count: ${modelDefinition.arrivalSchedules.size()}`);
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