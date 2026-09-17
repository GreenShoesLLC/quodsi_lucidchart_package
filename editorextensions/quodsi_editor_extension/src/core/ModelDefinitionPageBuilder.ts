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
    WorkSchedule,
    SeasonMode,
    UnitlessSample,
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

const log = getLogger('ModelDefinitionPageBuilder');

export class ModelDefinitionPageBuilder {
    private lastResourceLinkRejections: ResourceLinkRejection[] = [];
    /** Claims the last build rejected (dangling / duplicate). ModelManager.validateModel turns these into WARNINGs. */
    public getLastResourceLinkRejections(): ResourceLinkRejection[] { return this.lastResourceLinkRejections; }

    constructor(
        private storageAdapter: StorageAdapter,
        private elementFactory: LucidElementFactory) { }

    /**
     * Builds a ModelDefinition from an existing converted page
     */
    public buildFromConvertedPage(page: PageProxy): ModelDefinition | null {
        try {
            // First validate that we have a valid page
            if (!page) {
                log.error('Page is undefined');
                return null;
            }

            // Log page details
            log.trace('Page details:');
            log.trace(JSON.stringify({
                pageExists: !!page,
                pageId: page.id,
                pageTitle: page.getTitle?.(),
                hasAllBlocks: 'allBlocks' in page,
                hasGetTitle: 'getTitle' in page,
                constructor: page.constructor.name
            }));
            log.trace(`Starting model definition build for page ${page.id}`);
            // Add explicit type check before creating ModelLucid
            if (!this.elementFactory.isPageProxy(page)) {
                log.error('Invalid page proxy provided');
                return null;
            }

            // Create ModelLucid using the element factory
            let modelLucid;
            try {
                modelLucid = this.elementFactory.createPlatformObject(page, SimulationObjectType.Model) as ModelLucid;
                if (!modelLucid) {
                    log.error('Failed to create ModelLucid');
                    return null;
                }
            } catch (error) {
                log.error(`Error creating ModelLucid: ${error instanceof Error ? error.message : String(error)}`);
                if (error instanceof Error && error.stack) {
                    log.error(`Stack trace: ${error.stack}`);
                }
                return null;
            }

            let modelData;
            try {
                modelData = modelLucid.getSimulationObject();
                if (!modelData) {
                    log.error('Model data is undefined');
                    return null;
                }
            } catch (error) {
                log.error(`Error getting simulation object: ${error instanceof Error ? error.message : String(error)}`);
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
                    log.error(`ModelDefinition ${key} not properly initialized`);
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
                    log.warn(`No type info found for block ${blockId}`);
                    continue;
                }
                blocksByType.get(typeInfo.type)?.push(block);
            }
            // Process types in dependency order

            // Process each type in order
            for (const type of processingOrder) {
                const blocks = blocksByType.get(type) || [];
                log.trace(`Processing ${blocks.length} blocks of type ${type}`);

                for (const block of blocks) {
                    try {
                        const platformObject = this.elementFactory.createPlatformObject(block, type);
                        const simObject = platformObject.getSimulationObject();

                        switch (type) {
                            case SimulationObjectType.Activity:
                                modelDefinition.activities.add(simObject);
                                log.trace(`Added activity: ${simObject.name}`);
                                break;

                            case SimulationObjectType.Generator:
                                modelDefinition.generators.add(simObject);
                                log.trace(`Added generator: ${simObject.name}`);
                                break;
                        }
                    } catch (error) {
                        log.error(`Error processing block of type ${type}: ${error}`);
                    }
                }
            }

            // Link blocks and swimlane lanes to the resources they claim. Must
            // run after loadResources (needs the Resource objects); its position
            // relative to the block pass is incidental -- claims are read from
            // shapeData, not from anything that pass builds.
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

            // Load work schedules from storage. Order relative to the
            // resource/activity passes is incidental -- the link is an id on
            // the target, resolved by validation, not by construction here.
            this.loadWorkSchedules(page, modelDefinition);

            // Process all lines (connectors)
            log.trace(`Processing ${page.allLines.size} lines`);
            for (const [lineId, line] of page.allLines) {
                const typeInfo = this.storageAdapter.getElementType(line);
                if (!typeInfo || typeInfo.type !== SimulationObjectType.Connector) continue;

                try {
                    const platformObject = this.elementFactory.createPlatformObject(line, typeInfo.type);
                    const connector = platformObject.getSimulationObject();

                    // Skip adding self-referencing connectors
                    if (connector.sourceId && connector.targetId && connector.sourceId === connector.targetId) {
                        log.warn(`Skipping self-referencing connector from ${connector.sourceId} to itself`);
                        continue;
                    }

                    modelDefinition.connectors.add(connector);
                } catch (error) {
                    log.error(`Error processing line ${lineId}`);
                }
            }

            // Log summary with more detail
            this.logModelDefinitionSummary(modelDefinition);

            return modelDefinition;

        } catch (error) {
            log.error(`Error building ModelDefinition: ${error instanceof Error ? error.message : 'Unknown error'}`);
            if (error instanceof Error) {
                log.error(`Error stack: ${error.stack}`);
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
                // The work-schedule link (spec 2026-08-27 §3.2). Carried
                // through so a scheduled resource keeps following its
                // schedule across a rebuild and reaches the engine wire --
                // Resource.toJSON() emits it, omit@absent, so nothing else
                // is needed downstream. An empty string is treated as absent,
                // matching the shared class's own "omit@absent/''" rule.
                if (stored.workScheduleId) resource.workScheduleId = stored.workScheduleId;
                if (Array.isArray(stored.levers)) resource.levers = stored.levers;
                modelDefinition.resources.add(resource);
            } catch (error) {
                log.error(`Error deserializing resource ${stored?.id}: ${error}`);
            }
        }
        log.trace(`Final resources count: ${modelDefinition.resources.size()}`);
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
                    } catch (error) { log.warn(`Bad q_swimlane on ${blockId}: ${error}`); }
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
            log.warn(`Rejected ${resolution.rejected.length} resource claim(s)`);
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
        log.trace('Loading resource requirements');

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
                log.error(`Error deserializing resource requirement ${raw?.id}: ${error}`);
            }
        }

        log.trace(`Final requirements count: ${modelDefinition.resourceRequirements.size()}`);
    }

    /**
     * Loads state definitions from storage and adds them to the model definition.
     */
    private loadStates(page: PageProxy, modelDefinition: ModelDefinition): void {
        log.trace('Loading states from storage');

        // Get states from page storage
        const serializedStates = this.storageAdapter.getStates(page);
        log.trace(`Found ${serializedStates.length} states in storage`);

        // Deserialize and add each state to the model definition
        for (const serializedState of serializedStates) {
            try {
                const state = State.fromJSON(serializedState);
                modelDefinition.states.add(state);
                log.trace(`Added state: ${state.name} (${state.componentType})`);
            } catch (error) {
                log.error(`Error deserializing state: ${error}`);
            }
        }

        log.trace(`Final states count: ${modelDefinition.states.size()}`);
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
        log.trace('Loading entities from storage');

        // Get entities from page storage
        const serializedEntities = this.storageAdapter.getEntities(page);
        log.trace(`Found ${serializedEntities.length} entities in storage`);

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
                log.trace(`Added entity: ${entity.name}`);
            } catch (error) {
                log.error(`Error deserializing entity: ${error}`);
            }
        }

        log.trace(`Final entities count: ${modelDefinition.entities.size()}`);
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
        log.trace('Loading arrival patterns from storage');

        const serializedPatterns = this.storageAdapter.getArrivalPatterns(page);
        log.trace(`Found ${serializedPatterns.length} arrival patterns in storage`);

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
                log.trace(`Added arrival pattern: ${pattern.name}`);
            } catch (error) {
                log.error(`Error deserializing arrival pattern: ${error}`);
            }
        }

        log.trace(`Final arrival patterns count: ${modelDefinition.arrivalPatterns.size()}`);
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
        log.trace('Loading arrival schedules from storage');

        const serializedSchedules = this.storageAdapter.getArrivalSchedules(page);
        log.trace(`Found ${serializedSchedules.length} arrival schedules in storage`);

        for (const serialized of serializedSchedules) {
            try {
                const schedule = new ArrivalSchedule(serialized.id, serialized.name);
                if (serialized.timeUnit !== undefined) schedule.timeUnit = serialized.timeUnit as any;
                if (serialized.arrivals !== undefined) schedule.arrivals = serialized.arrivals;
                modelDefinition.arrivalSchedules.add(schedule);
                log.trace(`Added arrival schedule: ${schedule.name}`);
            } catch (error) {
                log.error(`Error deserializing arrival schedule: ${error}`);
            }
        }

        log.trace(`Final arrival schedules count: ${modelDefinition.arrivalSchedules.size()}`);
    }

    /**
     * Loads work schedules from storage and adds them to the model definition
     * (spec 2026-08-27 §3.1).
     *
     * Page-level list (`q_work_schedules`), mirroring loadArrivalSchedules
     * above. Fields absent from storage are left at the WorkSchedule
     * constructor's defaults, and those defaults ARE the values `toJSON()`
     * omits at (`offShiftCapacity` 0, `offShiftRule` 'finish',
     * `pattern`/`exceptions` []), so an absent key means "still default" and
     * the record round-trips byte-identically. There is no class-default /
     * wire-omit divergence to override the way ArrivalPattern's `seasonMode`
     * has.
     *
     * Rows and exceptions are assigned by reference from the parsed JSON:
     * they are plain data on both sides (`WorkScheduleRow` /
     * `WorkScheduleException` are interfaces, not classes), and
     * `WorkSchedule.toJSON()` rebuilds each one key-by-key on the way out --
     * which is what keeps a stray stored key off the engine's
     * `extra="forbid"` parser.
     */
    private loadWorkSchedules(page: PageProxy, modelDefinition: ModelDefinition): void {
        log.trace('Loading work schedules from storage');

        const serializedSchedules = this.storageAdapter.getWorkSchedules(page);
        log.trace(`Found ${serializedSchedules.length} work schedules in storage`);

        for (const serialized of serializedSchedules) {
            try {
                const schedule = new WorkSchedule(serialized.id, serialized.name);
                if (serialized.offShiftCapacity !== undefined) {
                    schedule.offShiftCapacity = serialized.offShiftCapacity;
                }
                if (serialized.offShiftRule !== undefined) {
                    schedule.offShiftRule = serialized.offShiftRule as typeof schedule.offShiftRule;
                }
                if (serialized.pattern !== undefined) {
                    schedule.pattern = serialized.pattern as typeof schedule.pattern;
                }
                if (serialized.exceptions !== undefined) {
                    schedule.exceptions = serialized.exceptions as typeof schedule.exceptions;
                }
                modelDefinition.workSchedules.add(schedule);
                log.trace(`Added work schedule: ${schedule.name}`);
            } catch (error) {
                log.error(`Error deserializing work schedule: ${error}`);
            }
        }

        log.trace(`Final work schedules count: ${modelDefinition.workSchedules.size()}`);
    }

    /**
     * Logs a summary of the ModelDefinition contents
     */
    private logModelDefinitionSummary(modelDefinition: ModelDefinition): void {
        if (!log.isEnabled('trace')) return;

        log.trace('Model Definition Summary:');
        log.trace(`- Model ID: ${modelDefinition.id}`);
        log.trace(`- Model Name: ${modelDefinition.name}`);

        // Log activities with names
        const activities = modelDefinition.activities.getAll();
        log.trace(`- Activities: ${activities.length}`);
        activities.forEach((activity, index) => {
            log.trace(`  ${index + 1}. ${activity.name}`);
        });

        log.trace(`- Generators: ${modelDefinition.generators.size()}`);
        log.trace(`- Resources: ${modelDefinition.resources.size()}`);
        log.trace(`- Requirements: ${modelDefinition.resourceRequirements.size()}`);
        log.trace(`- Entities: ${modelDefinition.entities.size()}`);
        log.trace(`- Connectors: ${modelDefinition.connectors.size()}`);
    }
}