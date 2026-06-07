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
    Resource,
    ResourceRequirement,
    MappingSource,
    generateUniqueName,
    SwimLaneQuodsiData,
    SwimLaneLaneMapping,
    SwimLaneResourceData,
    generateUUID
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
                this.log('Re-conversion: applying partial updates');
                // For re-conversion, only clear data for elements that are in the mappings
                // This allows updating specific elements without affecting others
                for (const [blockId, block] of page.allBlocks) {
                    if (mappings.has(blockId)) {
                        this.storageAdapter.clearElementData(block);
                    }
                }
                for (const [lineId, line] of page.allLines) {
                    if (mappings.has(lineId)) {
                        this.storageAdapter.clearElementData(line);
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

        // Calculate outgoing connections for probability calculation
        const outgoingConnectionCounts = new Map<string, number>();
        for (const [lineId, line] of page.allLines) {
            const endpoint1 = line.getEndpoint1();
            if (endpoint1?.connection) {
                const sourceId = endpoint1.connection.id;
                outgoingConnectionCounts.set(
                    sourceId,
                    (outgoingConnectionCounts.get(sourceId) || 0) + 1
                );
            }
        }

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

                const platformObject = this.elementFactory.createPlatformObject(
                    block,
                    targetType,
                    true, // isConversion
                    mappingSource
                );

                const element = platformObject.getSimulationObject();

                // Ensure unique name before registration using local tracking
                let typeNames = usedNamesByType.get(targetType);
                if (!typeNames) {
                    typeNames = new Set<string>();
                    usedNamesByType.set(targetType, typeNames);
                }

                // Check if name is already used in this conversion session
                if (typeNames.has(element.name)) {
                    element.name = generateUniqueName(element.name, blockId);
                    // Update storage with the unique name (createFromConversion already wrote the original)
                    this.storageAdapter.updateElementData(block, element);
                }

                // Track the name we're using
                typeNames.add(element.name);

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
                const outgoingCount = outgoingConnectionCounts.get(sourceId) || 1;
                const probability = 1.0 / outgoingCount;

                const platformObject = this.elementFactory.createPlatformObject(
                    line,
                    SimulationObjectType.Connector,
                    true, // isConversion
                    mappingSource
                );

                const connector = platformObject.getSimulationObject() as Connector;
                connector.sourceId = sourceId;
                connector.targetId = endpoint2.connection.id;
                connector.weight = probability;

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

                // Check if name is already used in this conversion session
                if (typeNames.has(element.name)) {
                    element.name = generateUniqueName(element.name, blockId);
                    // Update storage with the unique name (createFromConversion already wrote the original)
                    this.storageAdapter.updateElementData(block, element);
                }

                // Track the name we're using
                typeNames.add(element.name);

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
    private async convertConnections(
        page: PageProxy,
        analysis: ProcessAnalysisResult
    ): Promise<number> {
        this.log('Converting connections');
        let connectorCount = 0;

        // Calculate outgoing connections per block for probability calculation
        const outgoingConnectionCounts = new Map<string, number>();
        for (const [lineId, line] of page.allLines) {
            const endpoint1 = line.getEndpoint1();
            if (endpoint1?.connection) {
                const sourceId = endpoint1.connection.id;
                outgoingConnectionCounts.set(
                    sourceId,
                    (outgoingConnectionCounts.get(sourceId) || 0) + 1
                );
            }
        }

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
                const outgoingCount = outgoingConnectionCounts.get(sourceId) || 1;
                const probability = 1.0 / outgoingCount;

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
                connector.weight = probability;

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

        // Collect unique resource names from Activities
        const resourceNamesFromActivities = new Map<string, string[]>(); // resourceName -> blockIds

        for (const [blockId, block] of page.allBlocks) {
            const storedData = this.storageAdapter.getElementData<StoredActivityData>(block);
            if (storedData?.resourceName) {
                const existing = resourceNamesFromActivities.get(storedData.resourceName) || [];
                existing.push(blockId);
                resourceNamesFromActivities.set(storedData.resourceName, existing);
            }
        }

        if (resourceNamesFromActivities.size === 0) {
            this.log('No auto-resources to create');
            return 0;
        }

        this.log(`Found ${resourceNamesFromActivities.size} unique resource names to create`);

        // Calculate position for new Resource blocks (right side of diagram)
        const rightmostX = this.findRightmostX(page);
        let resourceY = 100;
        const resourceSpacing = 80;

        // Load block class for creating new shapes
        const client = ModelManager.getClient();
        await client.loadBlockClasses(['ProcessBlock']);

        const createdResources = new Map<string, BlockProxy>();

        // Ensure we have a Set for Resource names
        let resourceNames = usedNamesByType.get(SimulationObjectType.Resource);
        if (!resourceNames) {
            resourceNames = new Set<string>();
            usedNamesByType.set(SimulationObjectType.Resource, resourceNames);
        }

        // Create visual blocks for each unique resource name
        for (const [resourceName, activityBlockIds] of resourceNamesFromActivities) {
            this.log(`Creating Resource block for: ${resourceName}`);

            // Add new block to page
            const newBlock = page.addBlock({
                className: 'ProcessBlock',
                boundingBox: {
                    x: rightmostX + 100,
                    y: resourceY,
                    w: 120,
                    h: 60
                }
            });
            newBlock.textAreas.set('Text', resourceName);
            resourceY += resourceSpacing;

            // Convert to Resource using existing flow
            const platformObject = this.elementFactory.createPlatformObject(
                newBlock,
                SimulationObjectType.Resource,
                true // isConversion
            );
            const resource = platformObject.getSimulationObject();

            // Ensure unique name before registration using local tracking
            if (resourceNames.has(resource.name)) {
                resource.name = generateUniqueName(resource.name, newBlock.id);
                // Update storage with the unique name (createFromConversion already wrote the original)
                this.storageAdapter.updateElementData(newBlock, resource);
            }

            // Track the name we're using
            resourceNames.add(resource.name);

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

                let resourceName = laneTitle;
                if (resourceNames.has(resourceName)) {
                    resourceName = `${laneTitle} (${blockId.substring(0, 6)}-${i})`;
                }
                resourceNames.add(resourceName);

                const bb = block.getBoundingBox();
                const resource = new Resource(
                    resourceId,
                    resourceName,
                    1,
                    bb.x + bb.w + 50,
                    bb.y + (i * 60)
                );
                resource.description = `Auto-created from swimlane lane: ${laneTitle}`;

                const modelDef = await this.modelManager.getModelDefinition();
                if (modelDef) {
                    modelDef.resources.add(resource);
                    const requirement = ResourceRequirement.createForSingleResource(resource);
                    modelDef.resourceRequirements.add(requirement);
                }

                const inlineResource: SwimLaneResourceData = {
                    id: resourceId,
                    name: resourceName,
                    capacity: 1,
                    description: resource.description,
                };

                laneMappings.push({
                    laneId: generateUUID(),
                    titleSnapshot: laneTitle,
                    assignmentMode: 'runtime-derive',
                    resource: inlineResource,
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