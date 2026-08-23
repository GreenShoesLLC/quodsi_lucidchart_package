import { PageProxy, BlockProxy, LineProxy } from 'lucid-extension-sdk';
import {
    ConversionResult,
    Model,
    SimulationObjectType,
    Connector,
    ConnectType,
    QuodsiLogger,
    ProcessAnalysisResult,
    DiagramElementKind,
    MappingSource,
    SimulationObject,
    generateUniqueName,
    StoredResourceRecord,
    SwimLaneQuodsiData,
    SwimLaneLaneMapping,
    generateUUID,
    planAutoResources,
    type ActivityResourceRef
} from '@quodsi/lucid-shared';

const SWIMLANE_DATA_KEY = 'q_swimlane';

import { StorageAdapter, SkippedElementsRecord } from '../../core/StorageAdapter';
import { ModelManager } from '../../core/ModelManager';
import { LucidElementFactory } from '../../services/LucidElementFactory';
import { LucidPageAnalyzer } from './LucidPageAnalyzer';

// Interface for stored activity data (matches ActivityLucid's StoredActivityData)
interface StoredActivityData {
    id: string;
    name?: string;
    resourceName?: string;
    [key: string]: any;
}

export class LucidPageConversionService extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[LucidPageConversionService]';
    private pageAnalyzer: LucidPageAnalyzer;

    constructor(
        private modelManager: ModelManager,
        private elementFactory: LucidElementFactory,
        private storageAdapter: StorageAdapter
    ) {
        super();
        this.setLogging(false);
        this.pageAnalyzer = new LucidPageAnalyzer();
    }

    /**
     * Checks if a page can be converted to a model
     */
    public canConvertPage(page: PageProxy): boolean {
        if (!page || !page.allBlocks || !page.allLines) {
            return false;
        }

        // Check if page already has model data
        if (this.storageAdapter.isQuodsiModel(page)) {
            return false;
        }

        // Must have at least one block to be convertible
        return page.allBlocks.size > 0;
    }

    /**
     * Converts a LucidChart page to a Quodsi simulation model
     */
    public async convertPage(page: PageProxy): Promise<ConversionResult> {
        this.log('Starting page conversion');

        try {
            // First, remove any existing model data
            if (this.storageAdapter.isQuodsiModel(page)) {
                this.log('Removing existing model data');
                this.modelManager.removeModelFromPage(page);
            }

            // Create model using LucidElementFactory
            const modelLucid = this.elementFactory.createPlatformObject(
                page,
                SimulationObjectType.Model,
                true // isConversion
            );

            // Get the model object from the platform object
            const model = modelLucid.getSimulationObject();

            // Initialize in the model manager
            await this.modelManager.initializeModel(model, page);

            // Verify model was initialized
            if (!this.storageAdapter.isQuodsiModel(page)) {
                throw new Error('Failed to initialize model on page');
            }

            // Analyze the page to determine element types
            const analysis = this.pageAnalyzer.analyzePage(page);

            // Convert blocks and connections
            const convertedBlocks = await this.convertBlocks(page, analysis);
            this.log('Blocks converted:', convertedBlocks);

            const convertedConnectors = await this.convertConnections(page, analysis);
            this.log('Connectors converted:', convertedConnectors);

            // Validate the converted model
            const validationResult = await this.modelManager.validateModel();
            this.log('Validation result:', validationResult);

            return {
                success: true,
                modelId: page.id,
                elementCount: {
                    activities: convertedBlocks.activities,
                    generators: convertedBlocks.generators,
                    resources: convertedBlocks.resources,
                    connectors: convertedConnectors
                }
            };
        } catch (error) {
            this.logError('Conversion failed:', error);
            throw error;
        }
    }

    /**
     * Converts a LucidChart page to a Quodsi simulation model using explicit mappings.
     * This allows users to override the automatic type detection.
     *
     * @param page The page to convert
     * @param mappings Map of element ID to target simulation type (null means skip)
     * @param userOverrideIds Set of element IDs that were explicitly set by the user
     */
    public async convertPageWithMappings(
        page: PageProxy,
        mappings: Map<string, SimulationObjectType | null>,
        userOverrideIds: Set<string> = new Set()
    ): Promise<ConversionResult> {
        this.log('Starting page conversion with explicit mappings');

        try {
            // Check if this is a re-conversion (page already has model data)
            const isReconversion = this.storageAdapter.isQuodsiModel(page);

            if (isReconversion) {
                this.log('Re-conversion: removing changed elements before re-adding');
                for (const [blockId] of page.allBlocks) {
                    if (mappings.has(blockId)) {
                        // removeElement clears q_data AND removes from every collection
                        // (Activity/Resource/etc.) with cascade cleanup — so a type change
                        // can't leave the old element behind. (Bug 2)
                        await this.modelManager.removeElement(blockId);
                    }
                }
                for (const [lineId] of page.allLines) {
                    if (mappings.has(lineId)) {
                        await this.modelManager.removeElement(lineId);
                    }
                }
            } else {
                // First-time conversion: create the model
                const modelLucid = this.elementFactory.createPlatformObject(
                    page,
                    SimulationObjectType.Model,
                    true // isConversion
                );

                const model = modelLucid.getSimulationObject();
                await this.modelManager.initializeModel(model, page);

                if (!this.storageAdapter.isQuodsiModel(page)) {
                    throw new Error('Failed to initialize model on page');
                }
            }

            // Convert elements using explicit mappings
            const counts = await this.convertElementsWithMappings(page, mappings, userOverrideIds);

            // Validate the converted model
            const validationResult = await this.modelManager.validateModel();
            this.log('Validation result:', validationResult);

            return {
                success: true,
                modelId: page.id,
                elementCount: {
                    activities: counts.activities,
                    generators: counts.generators,
                    resources: counts.resources,
                    connectors: counts.connectors
                }
            };
        } catch (error) {
            this.logError('Conversion with mappings failed:', error);
            throw error;
        }
    }

    /**
     * Converts elements using explicit type mappings
     */
    private async convertElementsWithMappings(
        page: PageProxy,
        mappings: Map<string, SimulationObjectType | null>,
        userOverrideIds: Set<string> = new Set()
    ): Promise<{ activities: number; generators: number; resources: number; connectors: number }> {
        let activities = 0;
        let generators = 0;
        let resources = 0;
        let connectors = 0;

        // Load existing skipped elements (for re-conversions) and merge with new skips
        const existingSkipped = this.storageAdapter.getSkippedElements(page);
        const skippedElements: SkippedElementsRecord = { ...existingSkipped };

        // Track used names locally during conversion to avoid duplicates
        // This is necessary because getModelDefinition() may rebuild from storage,
        // which doesn't include elements we've added in-memory during this conversion
        const usedNamesByType = new Map<SimulationObjectType, Set<string>>();
        this.seedResourceNames(page, usedNamesByType);

        // Process blocks
        for (const [blockId, block] of page.allBlocks) {
            const targetType = mappings.get(blockId);
            const isUserOverride = userOverrideIds.has(blockId);
            const mappingSource: MappingSource = isUserOverride ? 'user' : 'auto';

            // Skip if null (explicitly skipped) - track at page level
            if (targetType === null) {
                this.log(`Skipping block ${blockId} (explicitly skipped, source: ${mappingSource})`);
                skippedElements[blockId] = mappingSource;
                continue;
            }

            // Skip if not in mappings at all (not part of conversion)
            if (targetType === undefined) {
                this.log(`Skipping block ${blockId} (not in mappings)`);
                continue;
            }

            try {
                this.log(`Converting block ${blockId} to ${targetType} (source: ${mappingSource})`);

                // Remove from skipped if it was previously skipped (being converted now)
                delete skippedElements[blockId];

                // 1-based slot among same-type elements named so far, so the
                // shared naming policy's fallback reads "Activity 2" instead of
                // Lucid's opaque block id. Mirrors drawio (targetList.length + 1).
                const nameSequence = (usedNamesByType.get(targetType)?.size ?? 0) + 1;

                const platformObject = this.elementFactory.createPlatformObject(
                    block,
                    targetType,
                    true, // isConversion
                    mappingSource,
                    nameSequence
                );

                const element = platformObject.getSimulationObject();

                // Ensure unique name before registration using local tracking
                let typeNames = usedNamesByType.get(targetType);
                if (!typeNames) {
                    typeNames = new Set<string>();
                    usedNamesByType.set(targetType, typeNames);
                }

                this.reserveConvertedName(page, block, element, targetType, typeNames);

                await this.modelManager.registerElement(element, block);

                switch (targetType) {
                    case SimulationObjectType.Activity:
                        activities++;
                        break;
                    case SimulationObjectType.Generator:
                        generators++;
                        break;
                    case SimulationObjectType.Resource:
                        resources++;
                        break;
                }
            } catch (error) {
                this.logError(`Failed to convert block ${blockId}:`, error);
                throw error;
            }
        }

        // Process lines
        for (const [lineId, line] of page.allLines) {
            const targetType = mappings.get(lineId);
            const isUserOverride = userOverrideIds.has(lineId);
            const mappingSource: MappingSource = isUserOverride ? 'user' : 'auto';

            // Skip if null (explicitly skipped) - track at page level
            if (targetType === null) {
                this.log(`Skipping line ${lineId} (explicitly skipped, source: ${mappingSource})`);
                skippedElements[lineId] = mappingSource;
                continue;
            }

            // Skip if not a Connector
            if (targetType !== SimulationObjectType.Connector) {
                this.log(`Skipping line ${lineId} (not mapped to Connector)`);
                continue;
            }

            const endpoint1 = line.getEndpoint1();
            const endpoint2 = line.getEndpoint2();

            if (!endpoint1?.connection || !endpoint2?.connection) {
                this.log(`Line ${lineId} has invalid endpoints, skipping`);
                continue;
            }

            try {
                this.log(`Converting line ${lineId} to Connector (source: ${mappingSource})`);

                // Remove from skipped if it was previously skipped (being converted now)
                delete skippedElements[lineId];

                const sourceId = endpoint1.connection.id;

                const platformObject = this.elementFactory.createPlatformObject(
                    line,
                    SimulationObjectType.Connector,
                    true, // isConversion
                    mappingSource
                );

                const connector = platformObject.getSimulationObject() as Connector;
                connector.sourceId = sourceId;
                connector.targetId = endpoint2.connection.id;
                // Weight stays at the default 1 -- a RELATIVE SHARE, which is
                // what the engine normalizes and what the editor's own help text
                // describes ("a connector with weight 2 is twice as likely as one
                // with weight 1"). Conversion used to pre-divide it to 1/outgoing,
                // which was self-consistent only for the connectors that existed
                // at that moment: draw a fourth branch later and it defaults to 1
                // against three siblings holding 0.333, silently making the new
                // branch 3x more likely. drawio and Visio always used 1.

                // Same uniqueness pass the blocks loop above applies. Connectors
                // are named "<source> → <target>", so two lines between the same
                // pair (or into same-named shapes) collide — and DuplicateNameValidation
                // makes that an ERROR the user cannot clear, because connectors
                // have no rename UI. (86e233g6f)
                this.ensureUniqueConnectorName(connector, usedNamesByType, line);

                platformObject.updateFromPlatform();
                await this.modelManager.registerElement(connector, line);
                connectors++;
            } catch (error) {
                this.logError(`Failed to convert line ${lineId}:`, error);
                throw error;
            }
        }

        // Save skipped elements to page
        this.storageAdapter.setSkippedElements(page, skippedElements);
        this.log(`Saved ${Object.keys(skippedElements).length} skipped elements to page`);

        // Process auto-created resources from Activity resourceName fields
        const autoResourceCount = await this.processAutoCreatedResources(page, usedNamesByType);
        resources += autoResourceCount;

        // Auto-convert swimlane lanes to Resources (same as quick convert)
        const swimlaneResourceCount = await this.convertSwimLanes(page, usedNamesByType);
        resources += swimlaneResourceCount;

        this.log('Conversion counts:', { activities, generators, resources, connectors });
        return { activities, generators, resources, connectors };
    }

    /**
     * Converts blocks to simulation elements
     */
    private async convertBlocks(
        page: PageProxy,
        analysis: ProcessAnalysisResult
    ): Promise<{ activities: number; generators: number; resources: number }> {
        this.log('Starting block conversion');

        let activities = 0;
        let generators = 0;
        let resources = 0;

        // Track used names locally during conversion to avoid duplicates
        // This is necessary because getModelDefinition() may rebuild from storage,
        // which doesn't include elements we've added in-memory during this conversion
        const usedNamesByType = new Map<SimulationObjectType, Set<string>>();
        this.seedResourceNames(page, usedNamesByType);

        for (const [blockId, block] of page.allBlocks) {
            const blockAnalysis = analysis.blockAnalysis.get(blockId);
            if (!blockAnalysis?.elementType) {
                this.logError(`Missing element type for block ${blockId}`);
                continue;
            }

            try {
                this.log(`Creating element for block ${blockId}:`, {
                    type: blockAnalysis.elementType,
                    blockClass: block.getClassName()
                });

                // Create platform object using factory with conversion flag
                const platformObject = this.elementFactory.createPlatformObject(
                    block,
                    blockAnalysis.elementType,
                    true // isConversion
                );

                // Get the simulation object
                const element = platformObject.getSimulationObject();

                // Ensure unique name before registration using local tracking
                let typeNames = usedNamesByType.get(blockAnalysis.elementType);
                if (!typeNames) {
                    typeNames = new Set<string>();
                    usedNamesByType.set(blockAnalysis.elementType, typeNames);
                }

                this.reserveConvertedName(page, block, element, blockAnalysis.elementType, typeNames);

                // Register with model manager
                await this.modelManager.registerElement(element, block);

                // Update counts
                switch (blockAnalysis.elementType) {
                    case SimulationObjectType.Activity:
                        activities++;
                        break;
                    case SimulationObjectType.Generator:
                        generators++;
                        break;
                    case SimulationObjectType.Resource:
                        resources++;
                        break;
                }

                this.log(`Successfully converted block ${blockId}:`, {
                    type: element.type,
                    name: element.name
                });

            } catch (error) {
                this.logError(`Failed to convert block ${blockId}:`, error);
                throw error;
            }
        }

        // Process auto-created resources from Activity resourceName fields
        const autoResourceCount = await this.processAutoCreatedResources(page, usedNamesByType);
        resources += autoResourceCount;

        // Auto-convert swimlane lanes to Resources
        const swimlaneResourceCount = await this.convertSwimLanes(page, usedNamesByType);
        resources += swimlaneResourceCount;

        return { activities, generators, resources };
    }

    /**
     * Converts connections to simulation connectors
     */
    /**
     * Give `connector` a name no other connector in this conversion holds,
     * appending _2/_3 on collision, and persist it.
     *
     * Mirrors the de-duplication the blocks loop does for Activities/Resources/
     * Generators — connectors were the one type with no such pass, so a model
     * with two same-named shapes (or two lines between one pair) converted to
     * duplicate connector names. DuplicateNameValidation reports that as an
     * ERROR, and connectors can't be renamed in the UI, so the model was stuck
     * un-simulatable. (ClickUp 86e233g6f)
     */
    private ensureUniqueConnectorName(
        connector: Connector,
        usedNamesByType: Map<SimulationObjectType, Set<string>>,
        line: LineProxy
    ): void {
        let connectorNames = usedNamesByType.get(SimulationObjectType.Connector);
        if (!connectorNames) {
            connectorNames = new Set<string>();
            usedNamesByType.set(SimulationObjectType.Connector, connectorNames);
        }

        if (connectorNames.has(connector.name)) {
            connector.name = generateUniqueName(connector.name, (n) => connectorNames!.has(n));
            // createFromConversion already wrote the original name to storage.
            this.storageAdapter.updateElementData(line, connector);
        }

        connectorNames.add(connector.name);
    }

    private async convertConnections(
        page: PageProxy,
        analysis: ProcessAnalysisResult
    ): Promise<number> {
        this.log('Converting connections');
        let connectorCount = 0;
        // Legacy auto-conversion path (convertPage) — its own name tracker, since
        // it has no usedNamesByType of its own. Same reason as the mapped path.
        const usedNamesByType = new Map<SimulationObjectType, Set<string>>();

        for (const [lineId, line] of page.allLines) {
            try {
                this.log(`Processing line ${lineId}`);
                const endpoint1 = line.getEndpoint1();
                const endpoint2 = line.getEndpoint2();

                if (!endpoint1?.connection || !endpoint2?.connection) {
                    this.log(`Line ${lineId} has invalid endpoints`);
                    continue;
                }

                const sourceId = endpoint1.connection.id;

                // Create platform object using factory with conversion flag
                const platformObject = this.elementFactory.createPlatformObject(
                    line,
                    SimulationObjectType.Connector,
                    true // isConversion
                );

                // Get the simulation object and set connection-specific properties
                const connector = platformObject.getSimulationObject() as Connector;
                connector.sourceId = sourceId;
                connector.targetId = endpoint2.connection.id;
                // Weight stays at the default 1 -- a RELATIVE SHARE, which is
                // what the engine normalizes and what the editor's own help text
                // describes ("a connector with weight 2 is twice as likely as one
                // with weight 1"). Conversion used to pre-divide it to 1/outgoing,
                // which was self-consistent only for the connectors that existed
                // at that moment: draw a fourth branch later and it defaults to 1
                // against three siblings holding 0.333, silently making the new
                // branch 3x more likely. drawio and Visio always used 1.

                this.ensureUniqueConnectorName(connector, usedNamesByType, line);

                // Update the platform object to save changes
                platformObject.updateFromPlatform();

                // Register with model manager
                await this.modelManager.registerElement(connector, line);
                connectorCount++;

            } catch (error) {
                this.logError(`Failed to convert connection ${lineId}:`, error);
                throw error;
            }
        }

        this.log(`Converted ${connectorCount} connections`);
        return connectorCount;
    }

    /**
     * Seeds the Resource name set from the records ALREADY on the page.
     *
     * Every other type's names live on the elements this pass converts, so an
     * empty set is the right starting point for them. Resources do not: since
     * Plan 2b the records live in the page's q_resources and outlive any shape,
     * so a page can arrive at conversion already holding resources (authored in
     * the Resources tab, left behind by a deleted block, or written by an
     * earlier partial conversion). Starting from an empty set would let this
     * pass mint a second "Nurse".
     */
    private seedResourceNames(
        page: PageProxy,
        usedNamesByType: Map<SimulationObjectType, Set<string>>
    ): void {
        usedNamesByType.set(
            SimulationObjectType.Resource,
            new Set(this.storageAdapter.getResources(page).map(r => r.name))
        );
    }

    /**
     * Records the name a just-converted block ended up with, renaming it first
     * if this pass has already used it.
     *
     * A Resource block is EXEMPT from the rename, and that exemption is load
     * bearing. Its sim object is a PLACEHOLDER (always 'Unlinked Resource' --
     * see ResourceLucid.createSimObject), so the name it carries is not the
     * resource's name: the real one is on the q_resources record
     * createFromConversion just minted, already de-duplicated against every
     * record on the page. Renaming the placeholder would therefore rename
     * nothing, while the updateElementData that follows would merge the whole
     * domain Resource -- name, capacity, x/y/width/height, financials -- onto
     * the block's q_data, destroying the pointer and re-classifying the block
     * as storage format 1 on the next open (ResourceStorageMigration decides
     * purely on resourceId !== undefined). With two Resource blocks on a page
     * that fires on the second one every single time.
     */
    private reserveConvertedName(
        page: PageProxy,
        block: BlockProxy,
        element: SimulationObject,
        type: SimulationObjectType,
        typeNames: Set<string>
    ): void {
        if (type === SimulationObjectType.Resource) {
            const record = this.storageAdapter.getResources(page).find(r => String(r.id) === block.id);
            typeNames.add(record?.name ?? element.name);
            return;
        }

        if (typeNames.has(element.name)) {
            element.name = generateUniqueName(element.name, (n) => typeNames.has(n));
            // Update storage with the unique name (createFromConversion already wrote the original)
            this.storageAdapter.updateElementData(block, element);
        }
        typeNames.add(element.name);
    }

    /**
     * Creates visual Resource blocks for any Activities that have a resourceName field.
     * This allows users to embed resource references in Activity names like:
     * "name: Triage | duration: 5 | resource: Nurse"
     *
     * The method:
     * 1. Collects all unique resource names from converted Activities
     * 2. Creates new visual blocks on the page for each unique resource
     * 3. Converts those blocks to Resources
     * 4. Links the Activities' OperationSteps to the ResourceRequirements
     */
    private async processAutoCreatedResources(
        page: PageProxy,
        usedNamesByType: Map<SimulationObjectType, Set<string>>
    ): Promise<number> {
        this.log('Processing auto-created resources from Activity resourceName fields');

        // Ensure we have a Set for Resource names
        let resourceNames = usedNamesByType.get(SimulationObjectType.Resource);
        if (!resourceNames) {
            resourceNames = new Set<string>();
            usedNamesByType.set(SimulationObjectType.Resource, resourceNames);
        }

        // WHAT to create is decided by the shared planner (@quodsi/shared
        // conversion/autoResources): grouping activities that named the same
        // resource, resolving name collisions, and laying the new shapes out.
        // Only the page.addBlock call below is Lucid-specific.
        const refs: ActivityResourceRef[] = [];
        for (const [blockId, block] of page.allBlocks) {
            const storedData = this.storageAdapter.getElementData<StoredActivityData>(block);
            if (storedData?.resourceName) {
                refs.push({ elementId: blockId, resourceName: storedData.resourceName });
            }
        }

        // Bail BEFORE measuring the page: findRightmostX walks every block's
        // bounding box, which is wasted work on the overwhelmingly common page
        // where nothing asked for a resource.
        if (refs.length === 0) {
            this.log('No auto-resources to create');
            return 0;
        }

        // Checked against BOTH sources of a resource name: what this pass has
        // reserved, and what is already stored on the page. The planner labels
        // the shape it plans, so a predicate that could not see the stored
        // records would label a shape 'Nurse' while createFromConversion --
        // which does see them -- stored the record as 'Nurse_2'.
        const takenNames = new Set<string>([
            ...resourceNames,
            ...this.storageAdapter.getResources(page).map(r => r.name),
        ]);

        const plan = planAutoResources(
            refs,
            { originX: this.findRightmostX(page) },
            (candidate) => takenNames.has(candidate)
        );

        if (plan.length === 0) {
            this.log('No auto-resources to create');
            return 0;
        }

        this.log(`Found ${plan.length} unique resource names to create`);

        // Load block class for creating new shapes
        const client = ModelManager.getClient();
        await client.loadBlockClasses(['ProcessBlock']);

        const createdResources = new Map<string, BlockProxy>();

        // Create visual blocks for each planned resource
        for (const planned of plan) {
            const resourceName = planned.name;
            this.log(`Creating Resource block for: ${resourceName}`);

            // Add new block to page
            const newBlock = page.addBlock({
                className: 'ProcessBlock',
                boundingBox: planned.placement
            });
            // The planner already de-duplicated this name, so what the block is
            // labelled with is what the Resource ends up called.
            newBlock.textAreas.set('Text', resourceName);

            // Convert to Resource using existing flow
            const platformObject = this.elementFactory.createPlatformObject(
                newBlock,
                SimulationObjectType.Resource,
                true // isConversion
            );
            const resource = platformObject.getSimulationObject();

            // Reserve what the RECORD is called (see reserveConvertedName): the
            // name was settled twice over already -- by planAutoResources above
            // and by createFromConversion against the page's records -- and the
            // sim object here is only the placeholder.
            this.reserveConvertedName(page, newBlock, resource, SimulationObjectType.Resource, resourceNames);

            await this.modelManager.registerElement(resource, newBlock);

            createdResources.set(resourceName, newBlock);

            this.log(`Created Resource block ${newBlock.id} for: ${resourceName}`);
            // Note: Resource linking to Activities is now managed through the actions system
        }

        this.log(`Created ${createdResources.size} auto-resources`);
        return createdResources.size;
    }

    /**
     * Auto-converts swimlane lanes to Resources during page conversion.
     *
     * Storage format 2: each lane mints a MODEL-LEVEL record in the page's
     * q_resources and the lane mapping keeps only a `resourceId` pointer at
     * it. Nothing is pushed into the in-memory ModelDefinition -- the next
     * rebuild loads the records from q_resources and derives the
     * auto-requirements itself (reconcileAutoRequirements), so adding either
     * here would produce a duplicate that the rebuild then has to reconcile
     * away.
     */
    private async convertSwimLanes(
        page: PageProxy,
        usedNamesByType: Map<SimulationObjectType, Set<string>>
    ): Promise<number> {
        this.log('Processing swimlane lanes as Resources');
        let resourceCount = 0;

        let resourceNames = usedNamesByType.get(SimulationObjectType.Resource);
        if (!resourceNames) {
            resourceNames = new Set<string>();
            usedNamesByType.set(SimulationObjectType.Resource, resourceNames);
        }

        // Collected across every swimlane block on the page and written ONCE
        // below, so a page with several swimlanes still takes one q_resources
        // write instead of one per lane.
        const createdRecords: StoredResourceRecord[] = [];

        // A lane name is checked against EVERY source of a resource name: the
        // names this conversion pass reserved, the records already stored on
        // the page, and the lane records created further down this same loop.
        // `resourceNames` alone is not enough -- a caller that reaches this
        // method directly (or any future path that forgets to seed it) would
        // otherwise mint a second record carrying an existing record's name.
        const takenNames = new Set<string>([
            ...resourceNames,
            ...this.storageAdapter.getResources(page).map(r => r.name),
        ]);

        for (const [blockId, block] of page.allBlocks) {
            if (block.getClassName() !== 'AdvancedSwimLaneBlock') continue;

            this.log(`Found swimlane block: ${blockId}`);

            const swimlaneProxy = block as any;
            let lanes: any[];
            try {
                lanes = swimlaneProxy.getPrimaryLanes();
            } catch (e) {
                this.logError(`Could not get lanes for swimlane ${blockId}:`, e);
                continue;
            }

            if (!lanes || lanes.length === 0) {
                this.log(`Swimlane ${blockId} has no lanes, skipping`);
                continue;
            }

            const laneMappings: (SwimLaneLaneMapping | null)[] = [];

            for (let i = 0; i < lanes.length; i++) {
                const lane = lanes[i];
                const laneTitle = lane.getTitle() || `Lane ${i}`;
                const resourceId = generateUUID();

                const resourceName = generateUniqueName(laneTitle, (n) => takenNames.has(n));
                takenNames.add(resourceName);
                resourceNames.add(resourceName);

                // No geometry: a lane resource has no block of its own, and the
                // builder stamps the lane's box onto it at build time.
                createdRecords.push({
                    id: resourceId,
                    name: resourceName,
                    capacity: 1,
                    description: `Auto-created from swimlane lane: ${laneTitle}`,
                });

                laneMappings.push({
                    laneId: generateUUID(),
                    titleSnapshot: laneTitle,
                    assignmentMode: 'runtime-derive',
                    resourceId,
                });

                resourceCount++;
                this.log(`Created Resource "${resourceName}" for lane ${i} of swimlane ${blockId}`);
            }

            const swimlaneData: SwimLaneQuodsiData = {
                lanes: laneMappings,
                lastSyncedAt: new Date().toISOString(),
            };
            block.shapeData.set(SWIMLANE_DATA_KEY, JSON.stringify(swimlaneData));

            this.log(`Persisted q_swimlane for block ${blockId} with ${laneMappings.length} lane mappings`);
        }

        if (createdRecords.length > 0) {
            this.storageAdapter.setResources(page, [...this.storageAdapter.getResources(page), ...createdRecords]);
            this.log(`Appended ${createdRecords.length} lane resources to q_resources`);
        }

        this.log(`Auto-converted ${resourceCount} swimlane lanes to Resources`);
        return resourceCount;
    }

    /**
     * Finds the rightmost X coordinate of all blocks on the page.
     * Used to position auto-created Resource blocks to the right of existing shapes.
     */
    private findRightmostX(page: PageProxy): number {
        let maxX = 0;
        for (const [, block] of page.allBlocks) {
            const box = block.getBoundingBox();
            if (box) {
                maxX = Math.max(maxX, box.x + box.w);
            }
        }
        return maxX;
    }

}