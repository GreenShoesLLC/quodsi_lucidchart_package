import { ElementProxy, LineProxy, BlockProxy, PageProxy } from 'lucid-extension-sdk';
import {
    SimulationObjectType,
    Resource,
    ComponentLogger,
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

// Define a constant for the logger prefix
const LOG_PREFIX = '[LucidElementFactory]';

/**
 * Factory for creating platform-specific simulation objects from Lucid elements.
 */
export class LucidElementFactory {
    constructor(private storageAdapter: StorageAdapter) {
        // Logging is disabled by default
        this.setLogging(false);
    }

    /**
     * Enable or disable logging for this component
     */
    public setLogging(enabled: boolean): void {
        ComponentLogger.setEnabled(LOG_PREFIX, enabled);
    }

    /**
     * Creates the appropriate platform-specific simulation object based on the element type
     */
    public createPlatformObject(
        element: ElementProxy,
        type: SimulationObjectType,
        isConversion: boolean = false,
        mappingSource?: MappingSource
    ): SimObjectLucid<any> {
        ComponentLogger.log(LOG_PREFIX, `Creating platform object`, {
            elementId: element.id,
            type: type,
            elementType: element.constructor.name,
            isConversion: isConversion,
            mappingSource: mappingSource
        });

        try {
            switch (type) {
                case SimulationObjectType.Model:
                    ComponentLogger.log(LOG_PREFIX, `Checking PageProxy for Model`);
                    if (this.isPageProxy(element)) {
                        ComponentLogger.log(LOG_PREFIX, `Creating ModelLucid`);
                        return new ModelLucid(element, this.storageAdapter);
                    }
                    ComponentLogger.error(LOG_PREFIX, `Element is not a PageProxy for Model`);
                    break;

                case SimulationObjectType.Activity:
                    ComponentLogger.log(LOG_PREFIX, `Checking BlockProxy for Activity`);
                    if (this.isBlockProxy(element)) {
                        ComponentLogger.log(LOG_PREFIX, `Creating ActivityLucid`);
                        return isConversion
                            ? ActivityLucid.createFromConversion(element, this.storageAdapter, mappingSource)
                            : new ActivityLucid(element, this.storageAdapter);
                    }
                    ComponentLogger.error(LOG_PREFIX, `Element is not a BlockProxy for Activity`);
                    break;

                case SimulationObjectType.Connector:
                    ComponentLogger.log(LOG_PREFIX, `Checking LineProxy for Connector`);
                    if (this.isLineProxy(element)) {
                        ComponentLogger.log(LOG_PREFIX, `Creating ConnectorLucid`);
                        return isConversion
                            ? ConnectorLucid.createFromConversion(element, this.storageAdapter, mappingSource)
                            : new ConnectorLucid(element, this.storageAdapter);
                    }
                    ComponentLogger.error(LOG_PREFIX, `Element is not a LineProxy for Connector`);
                    break;

                case SimulationObjectType.Generator:
                    ComponentLogger.log(LOG_PREFIX, `Checking BlockProxy for Generator`);
                    if (this.isBlockProxy(element)) {
                        ComponentLogger.log(LOG_PREFIX, `Creating GeneratorLucid`);
                        return isConversion
                            ? GeneratorLucid.createFromConversion(element, this.storageAdapter, mappingSource)
                            : new GeneratorLucid(element, this.storageAdapter);
                    }
                    ComponentLogger.error(LOG_PREFIX, `Element is not a BlockProxy for Generator`);
                    break;

                case SimulationObjectType.Resource:
                    ComponentLogger.log(LOG_PREFIX, `Checking BlockProxy for Resource`);
                    if (this.isBlockProxy(element)) {
                        ComponentLogger.log(LOG_PREFIX, `Creating ResourceLucid`);
                        return isConversion
                            ? ResourceLucid.createFromConversion(element, this.storageAdapter, mappingSource)
                            : new ResourceLucid(element, this.storageAdapter);
                    }
                    ComponentLogger.error(LOG_PREFIX, `Element is not a BlockProxy for Resource`);
                    break;

                case SimulationObjectType.ResourceRequirement:
                    ComponentLogger.log(LOG_PREFIX, `Checking BlockProxy for ResourceRequirement`);
                    if (this.isBlockProxy(element)) {
                        ComponentLogger.log(LOG_PREFIX, `Creating ResourceRequirementLucid`);
                        return isConversion
                            ? ResourceRequirementLucid.createFromConversion(element, this.storageAdapter, mappingSource)
                            : new ResourceRequirementLucid(element, this.storageAdapter);
                    }
                    ComponentLogger.error(LOG_PREFIX, `Element is not a BlockProxy for ResourceRequirement`);
                    break;

                default:
                    ComponentLogger.error(LOG_PREFIX, `Unsupported simulation object type: ${type}`);
            }

            throw new Error(`Cannot create platform object for type ${type} from element ${element.id}`);
        } catch (error) {
            ComponentLogger.error(LOG_PREFIX, `Error creating platform object:`, {
                type: type,
                elementId: element.id,
                error: error instanceof Error ? error.message : String(error)
            });

            if (error instanceof Error) {
                ComponentLogger.error(LOG_PREFIX, `Error stack:`, error.stack);
            }

            throw error;
        }
    }

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
        ComponentLogger.log(LOG_PREFIX, `isBlockProxy check:`, {
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
        ComponentLogger.log(LOG_PREFIX, `isLineProxy check:`, {
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
        ComponentLogger.log(LOG_PREFIX, `isPageProxy check:`, {
            elementId: element?.id,
            result: isPage,
            element: element,
            hasGetTitle: element && 'getTitle' in element,
            hasAllBlocks: element && 'allBlocks' in element
        });
        return isPage;
    }
}