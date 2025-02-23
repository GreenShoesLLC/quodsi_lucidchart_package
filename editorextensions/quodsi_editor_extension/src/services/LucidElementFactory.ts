import { ElementProxy, LineProxy, BlockProxy, PageProxy } from 'lucid-extension-sdk';
import {
    SimulationObjectType,
    Resource
} from '@quodsi/shared';
import { StorageAdapter } from '../core/StorageAdapter';
import {
    SimObjectLucid,
    ActivityLucid,
    ConnectorLucid,
    EntityLucid,
    GeneratorLucid,
    ResourceLucid,
    ResourceRequirementLucid,
    ModelLucid
} from '../types';

/**
 * Factory for creating platform-specific simulation objects from Lucid elements.
 */
export class LucidElementFactory {
    constructor(private storageAdapter: StorageAdapter) { }

    /**
     * Creates the appropriate platform-specific simulation object based on the element type
     */
    public createPlatformObject(
        element: ElementProxy,
        type: SimulationObjectType,
        isConversion: boolean = false
    ): SimObjectLucid<any> {
        console.log(`[LucidElementFactory] Creating platform object`, {
            elementId: element.id,
            type: type,
            elementType: element.constructor.name,
            isConversion: isConversion
        });

        try {
            switch (type) {
                case SimulationObjectType.Model:
                    console.log(`[LucidElementFactory] Checking PageProxy for Model`);
                    if (this.isPageProxy(element)) {
                        console.log(`[LucidElementFactory] Creating ModelLucid`);
                        return new ModelLucid(element, this.storageAdapter);
                    }
                    console.error(`[LucidElementFactory] Element is not a PageProxy for Model`);
                    break;

                case SimulationObjectType.Activity:
                    console.log(`[LucidElementFactory] Checking BlockProxy for Activity`);
                    if (this.isBlockProxy(element)) {
                        console.log(`[LucidElementFactory] Creating ActivityLucid`);
                        return isConversion
                            ? ActivityLucid.createFromConversion(element, this.storageAdapter)
                            : new ActivityLucid(element, this.storageAdapter);
                    }
                    console.error(`[LucidElementFactory] Element is not a BlockProxy for Activity`);
                    break;

                case SimulationObjectType.Connector:
                    console.log(`[LucidElementFactory] Checking LineProxy for Connector`);
                    if (this.isLineProxy(element)) {
                        console.log(`[LucidElementFactory] Creating ConnectorLucid`);
                        return isConversion
                            ? ConnectorLucid.createFromConversion(element, this.storageAdapter)
                            : new ConnectorLucid(element, this.storageAdapter);
                    }
                    console.error(`[LucidElementFactory] Element is not a LineProxy for Connector`);
                    break;

                case SimulationObjectType.Entity:
                    console.log(`[LucidElementFactory] Checking BlockProxy for Entity`);
                    if (this.isBlockProxy(element)) {
                        console.log(`[LucidElementFactory] Creating EntityLucid`);
                        return isConversion
                            ? EntityLucid.createFromConversion(element, this.storageAdapter)
                            : new EntityLucid(element, this.storageAdapter);
                    }
                    console.error(`[LucidElementFactory] Element is not a BlockProxy for Entity`);
                    break;

                case SimulationObjectType.Generator:
                    console.log(`[LucidElementFactory] Checking BlockProxy for Generator`);
                    if (this.isBlockProxy(element)) {
                        console.log(`[LucidElementFactory] Creating GeneratorLucid`);
                        return isConversion
                            ? GeneratorLucid.createFromConversion(element, this.storageAdapter)
                            : new GeneratorLucid(element, this.storageAdapter);
                    }
                    console.error(`[LucidElementFactory] Element is not a BlockProxy for Generator`);
                    break;

                case SimulationObjectType.Resource:
                    console.log(`[LucidElementFactory] Checking BlockProxy for Resource`);
                    if (this.isBlockProxy(element)) {
                        console.log(`[LucidElementFactory] Creating ResourceLucid`);
                        return isConversion
                            ? ResourceLucid.createFromConversion(element, this.storageAdapter)
                            : new ResourceLucid(element, this.storageAdapter);
                    }
                    console.error(`[LucidElementFactory] Element is not a BlockProxy for Resource`);
                    break;

                case SimulationObjectType.ResourceRequirement:
                    console.log(`[LucidElementFactory] Checking BlockProxy for ResourceRequirement`);
                    if (this.isBlockProxy(element)) {
                        console.log(`[LucidElementFactory] Creating ResourceRequirementLucid`);
                        return isConversion
                            ? ResourceRequirementLucid.createFromConversion(element, this.storageAdapter)
                            : new ResourceRequirementLucid(element, this.storageAdapter);
                    }
                    console.error(`[LucidElementFactory] Element is not a BlockProxy for ResourceRequirement`);
                    break;

                default:
                    console.error(`[LucidElementFactory] Unsupported simulation object type: ${type}`);
            }

            throw new Error(`Cannot create platform object for type ${type} from element ${element.id}`);
        } catch (error) {
            console.error(`[LucidElementFactory] Error creating platform object:`, {
                type: type,
                elementId: element.id,
                error: error instanceof Error ? error.message : String(error)
            });

            if (error instanceof Error) {
                console.error(`[LucidElementFactory] Error stack:`, error.stack);
            }

            throw error;
        }
    }

    // Rest of the class remains the same...
    /**
     * Creates a ResourceRequirement from a Resource
     */
    public createResourceRequirement(
        element: BlockProxy,
        resource: Resource
    ): ResourceRequirementLucid {
        return ResourceRequirementLucid.createFromResource(
            element,
            this.storageAdapter,
            resource
        );
    }

    /**
     * Type guard for BlockProxy
     */
    private isBlockProxy(element: ElementProxy): element is BlockProxy {
        const isBlock = 'getClassName' in element && 'textAreas' in element;
        console.log(`[LucidElementFactory] isBlockProxy check:`, {
            elementId: element.id,
            result: isBlock,
            hasGetClassName: 'getClassName' in element,
            hasTextAreas: 'textAreas' in element
        });
        return isBlock;
    }

    /**
     * Type guard for LineProxy
     */
    private isLineProxy(element: ElementProxy): element is LineProxy {
        const isLine = 'getEndpoint1' in element && 'getEndpoint2' in element;
        console.log(`[LucidElementFactory] isLineProxy check:`, {
            elementId: element.id,
            result: isLine,
            hasGetEndpoint1: 'getEndpoint1' in element,
            hasGetEndpoint2: 'getEndpoint2' in element
        });
        return isLine;
    }

    /**
     * Type guard for PageProxy
     */
    public isPageProxy(element: ElementProxy): element is PageProxy {
        const isPage = element && 'getTitle' in element && 'allBlocks' in element;
        console.log(`[LucidElementFactory] isPageProxy check:`, {
            elementId: element?.id,
            result: isPage,
            element: element,
            hasGetTitle: element && 'getTitle' in element,
            hasAllBlocks: element && 'allBlocks' in element
        });
        return isPage;
    }
}