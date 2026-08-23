import { BlockProxy } from 'lucid-extension-sdk';
import {
    Resource,
    SimulationObjectType,
    ComponentLogger,
    parseStructuredName,
    extractResourceFields,
    MappingSource
} from '@quodsi/lucid-shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';

// Define a constant for the logger prefix
const LOG_PREFIX = '[ResourceLucid]';

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, false);

/**
 * Enable or disable logging for ResourceLucid
 */
export const setResourceLucidLogging = (enabled: boolean): void => {
    ComponentLogger.setEnabled(LOG_PREFIX, enabled);
};

/**
 * What a Resource BLOCK stores under q_data in storage format 2: a POINTER at
 * a model-level record in the page's q_resources list, and nothing else.
 *
 * The record itself (name, capacity, description, financials, levers) and the
 * geometry no longer live here -- ModelDefinitionPageBuilder reads the record
 * from q_resources and stamps the claiming block's box onto it. Anything this
 * class wrote beyond the pointer would be dead data at best, and at worst
 * re-classify the block as a format-1 record (see ResourceStorageMigration's
 * docblock on why `resourceId` alone decides that).
 */
interface StoredResourceData {
    id: string;
    resourceId?: string;
}

/**
 * Lucid-specific implementation of a Resource.
 * Maps a Lucid Block element to a simulation Resource.
 */
export class ResourceLucid extends SimObjectLucid<Resource> {
    constructor(
        block: BlockProxy, 
        storageAdapter: StorageAdapter
    ) {
        ComponentLogger.log(LOG_PREFIX, `Constructing ResourceLucid for block ID: ${block.id}`);
        super(block, storageAdapter);
    }

    get type(): SimulationObjectType {
        return SimulationObjectType.Resource;
    }

    /**
     * A PLACEHOLDER, not the model's resource.
     *
     * SimObjectLucid requires every wrapper to carry a sim object, and callers
     * use it for TYPE DISPATCH (`instanceof` / `.type`). Under storage format 2
     * the real record lives in q_resources and is loaded by
     * ModelDefinitionPageBuilder.loadResources(), which never consults this
     * class -- so nothing built here reaches modelDefinition.resources, and
     * ModelManager.registerElement/updateElement ignore Resource objects too.
     * It is stamped with the block's box only so a caller that reads geometry
     * off the wrapper sees the block it is drawn as.
     */
    protected createSimObject(): Resource {
        ComponentLogger.log(LOG_PREFIX, `Creating placeholder Resource for element ID: ${this.platformElementId}`);

        const stored = this.storageAdapter.getElementData(this.element) as StoredResourceData | null;
        const box = (this.element as BlockProxy).getBoundingBox();

        const resource = new Resource(
            stored?.resourceId ?? this.platformElementId,
            'Unlinked Resource',
            1,
            box.x ?? 0,
            box.y ?? 0
        );
        resource.width = box.w;
        resource.height = box.h;

        return resource;
    }

    /**
     * Writes back the POINTER and nothing else.
     *
     * Geometry, name, capacity, description, financials and levers all belong
     * to the model-level record now; writing any of them here would re-create
     * the format-1 shape-owned record this plan removes.
     */
    public updateFromPlatform(): void {
        ComponentLogger.log(LOG_PREFIX, `Updating Resource pointer from platform for element ID: ${this.platformElementId}`);

        const stored = this.storageAdapter.getElementData(this.element) as StoredResourceData | null;
        const dataToStore: StoredResourceData = {
            id: this.platformElementId,
            resourceId: stored?.resourceId
        };

        ComponentLogger.log(LOG_PREFIX, `Storing pointer for element ID: ${this.platformElementId}`, dataToStore);
        this.storageAdapter.updateElementData(this.element, dataToStore);
    }

    protected getElementName(defaultPrefix: string): string {
        const block = this.element as BlockProxy;

        // Check for text areas on the block
        if (block.textAreas && block.textAreas.size > 0) {
            for (const text of block.textAreas.values()) {
                if (text && text.trim()) {
                    const name = text.trim();
                    ComponentLogger.log(LOG_PREFIX, `Using text area content as name for element ID ${block.id}: ${name}`);
                    return name;
                }
            }
        }

        // If no text found, use class name
        const className = block.getClassName() || 'Block';
        const name = `${defaultPrefix} ${className}`;
        ComponentLogger.log(LOG_PREFIX, `Generated default name for element ID ${block.id}: ${name}`);
        return name;
    }

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter, mappingSource?: MappingSource, nameSequence?: number): ResourceLucid {
        ComponentLogger.log(LOG_PREFIX, `Creating ResourceLucid from conversion for block ID: ${block.id}, mappingSource: ${mappingSource}`);

        // Extract location AND shape size (Path X-lite)
        const box = block.getBoundingBox();

        // Create default resource using the static method with location
        const defaultResource = Resource.createDefault(
            block.id,
            box.x ?? 0,
            box.y ?? 0
        );
        defaultResource.width = box.w;
        defaultResource.height = box.h;

        // Get raw name and parse for structured data
        const rawName = SimObjectLucid.pickBlockName(block, {
            typeLabel: 'Resource',
            includeMasterName: false,
            sequence: nameSequence,
        });
        const parsed = parseStructuredName(rawName);
        const fields = extractResourceFields(parsed);

        ComponentLogger.log(LOG_PREFIX, `Parsed structured name for block ${block.id}:`, { rawName, fields });

        // Update shape text to clean name if we parsed structured data
        if (rawName.includes('|') && fields.name) {
            SimObjectLucid.updateBlockText(block, fields.name);
        }

        // Task 6 rewrites this to mint a q_resources record and write a pointer.
        // Until then it still writes the format-1 shape-owned record; only the
        // type annotation is dropped, because StoredResourceData is now the
        // pointer shape.
        const storedData = {
            id: defaultResource.id,
            name: fields.name || rawName,
            x: defaultResource.x,
            y: defaultResource.y,
            width: defaultResource.width,
            height: defaultResource.height,
            capacity: fields.capacity ?? defaultResource.capacity,
            financialProperties: defaultResource.financialProperties?.toJSON()
        };

        ComponentLogger.log(LOG_PREFIX, `Setting initial data for converted resource, block ID: ${block.id}`, storedData);

        // Set up element data (type + component data merged into single q_data)
        storageAdapter.setElementData(
            block,
            storedData,
            SimulationObjectType.Resource,
            {
                mappingSource: mappingSource
            }
        );

        // Now create the ResourceLucid instance
        return new ResourceLucid(block, storageAdapter);
    }
}