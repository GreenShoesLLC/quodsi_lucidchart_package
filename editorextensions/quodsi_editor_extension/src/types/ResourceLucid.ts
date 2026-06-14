import { BlockProxy } from 'lucid-extension-sdk';
import {
    Resource,
    SimulationObjectType,
    ComponentLogger,
    ResourceFinancialProperties,
    parseStructuredName,
    extractResourceFields,
    MappingSource,
    ScenarioLever
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

interface StoredResourceData {
    id: string;
    x?: number;
    y?: number;
    // Optional shape dimensions in SVG userSpace (Path X-lite).
    width?: number;
    height?: number;
    name?: string;
    description?: string;
    capacity?: number;
    financialProperties?: any;
    levers?: ScenarioLever[];
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

    protected createSimObject(): Resource {
        ComponentLogger.log(LOG_PREFIX, `Creating Resource simulation object for element ID: ${this.platformElementId}`);
        
        // Get stored custom data first
        const storedData = this.storageAdapter.getElementData(this.element) as StoredResourceData;

        // Create resource using stored data or defaults
        const resource = new Resource(
            this.platformElementId,
            storedData?.name || 'New Resource',
            storedData?.capacity ?? 1,
            storedData?.x ?? 0,
            storedData?.y ?? 0
        );

        // Restore description
        if (storedData?.description !== undefined) {
            resource.description = storedData.description;
        }

        // Deserialize financial properties
        if (storedData?.financialProperties) {
            resource.financialProperties = ResourceFinancialProperties.fromJSON(storedData.financialProperties);
        }

        // Carry forward scenario-lever authoring metadata. `levers` is a class
        // field (not a constructor param) defaulting to [], so reconstruction
        // drops it unless copied here -> published model.json loses levers.
        if (storedData?.levers) {
            resource.levers = storedData.levers;
        }

        // Update platform-specific fields after creation
        this.updatePlatformSpecificFields(resource);

        return resource;
    }

    private updatePlatformSpecificFields(resource: Resource): void {
        const block = this.element as BlockProxy;
        
        // Update location AND shape size from current platform (Path X-lite).
        const box = block.getBoundingBox();
        resource.setLocation(box.x ?? resource.x, box.y ?? resource.y);
        resource.width = box.w;
        resource.height = box.h;

        // Update name if needed
        if (!resource.name || resource.name === 'New Resource') {
            resource.name = this.getElementName('Resource');
        }

        ComponentLogger.log(LOG_PREFIX, 'Updated platform-specific fields', {
            x: resource.x,
            y: resource.y,
            width: resource.width,
            height: resource.height,
            name: resource.name
        });
    }

    public updateFromPlatform(): void {
        ComponentLogger.log(LOG_PREFIX, `Updating Resource from platform for element ID: ${this.platformElementId}`);
        
        // Extract location AND shape size from platform (Path X-lite).
        const box = (this.element as BlockProxy).getBoundingBox();

        // Update location
        this.simObject.setLocation(
            box.x ?? this.simObject.x,
            box.y ?? this.simObject.y
        );
        this.simObject.width = box.w;
        this.simObject.height = box.h;

        // Update name if not already set
        if (!this.simObject.name) {
            this.simObject.name = this.getElementName('Resource');
        }

        // Store updated data
        const dataToStore: StoredResourceData = {
            id: this.platformElementId,
            x: this.simObject.x,
            y: this.simObject.y,
            width: this.simObject.width,
            height: this.simObject.height,
            name: this.simObject.name,
            description: this.simObject.description,
            capacity: this.simObject.capacity,
            financialProperties: this.simObject.financialProperties?.toJSON()
        };

        ComponentLogger.log(LOG_PREFIX, `Storing updated data for element ID: ${this.platformElementId}`, dataToStore);
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

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter, mappingSource?: MappingSource): ResourceLucid {
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
        const rawName = SimObjectLucid.getNameFromBlock(block, 'Resource');
        const parsed = parseStructuredName(rawName);
        const fields = extractResourceFields(parsed);

        ComponentLogger.log(LOG_PREFIX, `Parsed structured name for block ${block.id}:`, { rawName, fields });

        // Update shape text to clean name if we parsed structured data
        if (rawName.includes('|') && fields.name) {
            SimObjectLucid.updateBlockText(block, fields.name);
        }

        // Convert to StoredResourceData format, using parsed values where available
        const storedData: StoredResourceData = {
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