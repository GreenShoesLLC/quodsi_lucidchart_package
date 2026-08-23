import { BlockProxy } from 'lucid-extension-sdk';
import {
    Resource,
    SimulationObjectType,
    ComponentLogger,
    parseStructuredName,
    extractResourceFields,
    generateUniqueName,
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

    /**
     * Converts a block to a Resource: mints the MODEL-LEVEL record in the
     * page's q_resources and leaves the block holding only a pointer at it.
     *
     * The record's id is the block's id, so the block that created a resource
     * is also its first claimant. Geometry is deliberately not stored -- the
     * builder stamps it from whichever block claims the record.
     *
     * Re-converting a block that already owns a record is a NO-OP on
     * q_resources: the record is model-level data the user may have edited
     * since, and re-minting it would reset the name/capacity and (worse)
     * re-run de-duplication against the record's own name.
     */
    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter, mappingSource?: MappingSource, nameSequence?: number): ResourceLucid {
        ComponentLogger.log(LOG_PREFIX, `Creating ResourceLucid from conversion for block ID: ${block.id}, mappingSource: ${mappingSource}`);

        const page = block.getPage();

        // Get raw name and parse for structured data
        const rawName = SimObjectLucid.pickBlockName(block, {
            typeLabel: 'Resource',
            includeMasterName: false,
            sequence: nameSequence,
        });
        const fields = extractResourceFields(parseStructuredName(rawName));

        ComponentLogger.log(LOG_PREFIX, `Parsed structured name for block ${block.id}:`, { rawName, fields });

        // Update shape text to clean name if we parsed structured data
        if (rawName.includes('|') && fields.name) {
            SimObjectLucid.updateBlockText(block, fields.name);
        }

        const existing = storageAdapter.getResources(page);
        if (!existing.some(r => String(r.id) === block.id)) {
            const taken = new Set(existing.map(r => r.name));
            const defaults = Resource.createDefault(block.id);
            existing.push({
                id: block.id,
                name: generateUniqueName(fields.name || rawName, (n) => taken.has(n)),
                capacity: fields.capacity ?? defaults.capacity,
                description: '',
                financialProperties: { enabled: false, costPerSeize: 0, costPerHourUtilized: 0, costPerHourIdle: 0 },
            });
            storageAdapter.setResources(page, existing);
        }

        ComponentLogger.log(LOG_PREFIX, `Setting pointer for converted resource, block ID: ${block.id}`);

        // The block stores the POINTER and nothing else -- see StoredResourceData.
        storageAdapter.setElementData(
            block,
            { id: block.id, resourceId: block.id } as StoredResourceData,
            SimulationObjectType.Resource,
            {
                mappingSource: mappingSource
            }
        );

        // Now create the ResourceLucid instance
        return new ResourceLucid(block, storageAdapter);
    }
}