import { ElementProxy, LineProxy, BlockProxy, PageProxy } from 'lucid-extension-sdk';
import {
    SimulationObjectType,
    getLogger,
    MappingSource
} from '@quodsi/lucid-shared';
import { StorageAdapter } from '../core/StorageAdapter';
import {
    SimObjectLucid,
    ActivityLucid,
    ConnectorLucid,
    GeneratorLucid,
    ResourceLucid,
    ResourceRequirementLucid,
    ModelLucid
} from '../types';

const log = getLogger('LucidElementFactory');

/**
 * Factory for creating platform-specific simulation objects from Lucid elements.
 */
export class LucidElementFactory {
    constructor(private storageAdapter: StorageAdapter) {}


    /**
     * Creates the appropriate platform-specific simulation object based on the element type
     */
    /**
     * @param nameSequence 1-based position among already-named elements of this
     *   type in the current conversion. Feeds the shared naming policy's
     *   fallback so an unnamed shape becomes "Activity 2" rather than carrying
     *   Lucid's long opaque block id. Omit outside conversion.
     */
    public createPlatformObject(
        element: ElementProxy,
        type: SimulationObjectType,
        isConversion: boolean = false,
        mappingSource?: MappingSource,
        nameSequence?: number
    ): SimObjectLucid<any> {
        log.trace(`Creating platform object`, {
            elementId: element.id,
            type: type,
            elementType: element.constructor.name,
            isConversion: isConversion,
            mappingSource: mappingSource
        });

        try {
            switch (type) {
                case SimulationObjectType.Model:
                    log.trace(`Checking PageProxy for Model`);
                    if (this.isPageProxy(element)) {
                        log.trace(`Creating ModelLucid`);
                        return new ModelLucid(element, this.storageAdapter);
                    }
                    log.error(`Element is not a PageProxy for Model`);
                    break;

                case SimulationObjectType.Activity:
                    log.trace(`Checking BlockProxy for Activity`);
                    if (this.isBlockProxy(element)) {
                        log.trace(`Creating ActivityLucid`);
                        return isConversion
                            ? ActivityLucid.createFromConversion(element, this.storageAdapter, mappingSource, nameSequence)
                            : new ActivityLucid(element, this.storageAdapter);
                    }
                    log.error(`Element is not a BlockProxy for Activity`);
                    break;

                case SimulationObjectType.Connector:
                    log.trace(`Checking LineProxy for Connector`);
                    if (this.isLineProxy(element)) {
                        log.trace(`Creating ConnectorLucid`);
                        return isConversion
                            ? ConnectorLucid.createFromConversion(element, this.storageAdapter, mappingSource)
                            : new ConnectorLucid(element, this.storageAdapter);
                    }
                    log.error(`Element is not a LineProxy for Connector`);
                    break;

                case SimulationObjectType.Generator:
                    log.trace(`Checking BlockProxy for Generator`);
                    if (this.isBlockProxy(element)) {
                        log.trace(`Creating GeneratorLucid`);
                        return isConversion
                            ? GeneratorLucid.createFromConversion(element, this.storageAdapter, mappingSource, nameSequence)
                            : new GeneratorLucid(element, this.storageAdapter);
                    }
                    log.error(`Element is not a BlockProxy for Generator`);
                    break;

                case SimulationObjectType.Resource:
                    log.trace(`Checking BlockProxy for Resource`);
                    if (this.isBlockProxy(element)) {
                        log.trace(`Creating ResourceLucid`);
                        return isConversion
                            ? ResourceLucid.createFromConversion(element, this.storageAdapter, mappingSource, nameSequence)
                            : new ResourceLucid(element, this.storageAdapter);
                    }
                    log.error(`Element is not a BlockProxy for Resource`);
                    break;

                case SimulationObjectType.ResourceRequirement:
                    log.trace(`Checking BlockProxy for ResourceRequirement`);
                    if (this.isBlockProxy(element)) {
                        log.trace(`Creating ResourceRequirementLucid`);
                        return isConversion
                            ? ResourceRequirementLucid.createFromConversion(element, this.storageAdapter, mappingSource)
                            : new ResourceRequirementLucid(element, this.storageAdapter);
                    }
                    log.error(`Element is not a BlockProxy for ResourceRequirement`);
                    break;

                default:
                    log.error(`Unsupported simulation object type: ${type}`);
            }

            throw new Error(`Cannot create platform object for type ${type} from element ${element.id}`);
        } catch (error) {
            log.error(`Error creating platform object:`, {
                type: type,
                elementId: element.id,
                error: error instanceof Error ? error.message : String(error)
            });

            if (error instanceof Error) {
                log.error(`Error stack:`, error.stack);
            }

            throw error;
        }
    }

    /**
     * Type guard for BlockProxy
     */
    private isBlockProxy(element: ElementProxy): element is BlockProxy {
        const isBlock = 'getClassName' in element && 'textAreas' in element;
        log.trace(`isBlockProxy check:`, {
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
        log.trace(`isLineProxy check:`, {
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
        log.trace(`isPageProxy check:`, {
            elementId: element?.id,
            result: isPage,
            element: element,
            hasGetTitle: element && 'getTitle' in element,
            hasAllBlocks: element && 'allBlocks' in element
        });
        return isPage;
    }
}