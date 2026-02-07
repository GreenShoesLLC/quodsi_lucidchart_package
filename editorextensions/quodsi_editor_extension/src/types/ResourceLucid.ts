import { BlockProxy } from 'lucid-extension-sdk';
import {
    Resource,
    SimulationObjectType,
    ComponentLogger,
    ResourceFinancialProperties,
    parseStructuredName,
    extractResourceFields,
    MappingSource
} from '@quodsi/shared';
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
    x?: number;  // Added x coordinate
    y?: number;  // Added y coordinate
    name?: string;
    capacity?: number;
    financialProperties?: any;
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

        // Deserialize financial properties
        if (storedData?.financialProperties) {
            resource.financialProperties = ResourceFinancialProperties.fromJSON(storedData.financialProperties);
        }

        // Update platform-specific fields after creation
        this.updatePlatformSpecificFields(resource);

        return resource;
    }

    private updatePlatformSpecificFields(resource: Resource): void {
        const block = this.element as BlockProxy;
        
        // Update location from current platform
        const location = block.getLocation();
        resource.setLocation(location.x ?? resource.x, location.y ?? resource.y);

        // Update name if needed
        if (!resource.name || resource.name === 'New Resource') {
            resource.name = this.getElementName('Resource');
        }

        ComponentLogger.log(LOG_PREFIX, 'Updated platform-specific fields', {
            x: resource.x,
            y: resource.y,
            name: resource.name
        });
    }

    public updateFromPlatform(): void {
        ComponentLogger.log(LOG_PREFIX, `Updating Resource from platform for element ID: ${this.platformElementId}`);
        
        // Extract location from platform
        const location = (this.element as BlockProxy).getLocation();
        
        // Update location
        this.simObject.setLocation(
            location.x ?? this.simObject.x, 
            location.y ?? this.simObject.y
        );

        // Update name if not already set
        if (!this.simObject.name) {
            this.simObject.name = this.getElementName('Resource');
        }

        // Store updated data
        const dataToStore: StoredResourceData = {
            id: this.platformElementId,
            x: this.simObject.x,     // Store x coordinate
            y: this.simObject.y,     // Store y coordinate
            name: this.simObject.name,
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

        // Extract location
        const location = block.getLocation();

        // Create default resource using the static method with location
        const defaultResource = Resource.createDefault(
            block.id,
            location.x ?? 0,
            location.y ?? 0
        );

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