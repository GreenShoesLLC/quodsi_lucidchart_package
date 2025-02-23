import { BlockProxy } from 'lucid-extension-sdk';
import { 
    Resource,
    SimulationObjectType 
} from '@quodsi/shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';


interface StoredResourceData {
    id: string;
    name?: string;
    capacity?: number;
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
        // Pass the block as the element to the parent constructor
        super(block, storageAdapter);
    }

    get type(): SimulationObjectType {
        return SimulationObjectType.Resource;
    }

    protected createSimObject(): Resource {
        // Create resource with element-specific properties
        const resource = new Resource(
            this.platformElementId,
            '',  // name will be set below
            1    // default capacity
        );

        // Get stored custom data
        const storedData = this.storageAdapter.getElementData(this.element) as StoredResourceData;

        if (storedData) {
            // Only copy specific properties from stored data
            resource.name = storedData.name || this.getElementName('Resource');
            resource.capacity = storedData.capacity ?? 1;
        } else {
            resource.name = this.getElementName('Resource');
        }

        return resource;
    }

    public updateFromPlatform(): void {
        // Update name if not already set
        if (!this.simObject.name) {
            this.simObject.name = this.getElementName('Resource');
        }

        // Store only custom data properties
        const dataToStore = {
            id: this.platformElementId,
            name: this.simObject.name,
            capacity: this.simObject.capacity
        };

        this.storageAdapter.updateElementData(this.element, dataToStore);
    }

    protected getElementName(defaultPrefix: string): string {
        const block = this.element as BlockProxy;

        // Check for text areas on the block
        if (block.textAreas && block.textAreas.size > 0) {
            for (const text of block.textAreas.values()) {
                if (text && text.trim()) {
                    return text.trim();
                }
            }
        }

        // If no text found, use class name
        const className = block.getClassName() || 'Block';
        return `${defaultPrefix} ${className}`;
    }
}