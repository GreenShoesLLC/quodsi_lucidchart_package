import { BlockProxy } from 'lucid-extension-sdk';
import { 
    Entity,
    SimulationObjectType 
} from '@quodsi/shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';

interface StoredEntityData {
    id: string;
    name?: string;
}

export class EntityLucid extends SimObjectLucid<Entity> {
    constructor(block: BlockProxy, storageAdapter: StorageAdapter) {
        super(block, storageAdapter);
    }

    get type(): SimulationObjectType {
        return SimulationObjectType.Entity;
    }

    protected createSimObject(): Entity {
        // Create entity with element-specific properties
        const entity = new Entity(
            this.platformElementId,
            ''  // name will be set below
        );

        // Get stored custom data
        const storedData = this.storageAdapter.getElementData(this.element) as StoredEntityData;

        if (storedData) {
            // Only copy name from stored data
            entity.name = storedData.name || this.getElementName('Entity');
        } else {
            entity.name = this.getElementName('Entity');
        }

        return entity;
    }

    public updateFromPlatform(): void {
        // Update name only if not already set
        if (!this.simObject.name) {
            this.simObject.name = this.getElementName('Entity');
        }

        // Store custom data properties
        const dataToStore = {
            id: this.platformElementId,
            name: this.simObject.name
        };

        this.storageAdapter.updateElementData(this.element, dataToStore);
    }

    protected getElementName(defaultPrefix: string): string {
        const block = this.element as BlockProxy;

        if (block.textAreas && block.textAreas.size > 0) {
            for (const text of block.textAreas.values()) {
                if (text && text.trim()) {
                    return text.trim();
                }
            }
        }

        const className = block.getClassName() || 'Block';
        return `${defaultPrefix} ${className}`;
    }

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter): EntityLucid {
        // Create default entity using the static method from Entity
        const defaultEntity = Entity.createDefault(block.id);
        
        // Get name from block text if available
        const name = SimObjectLucid.getNameFromBlock(block, 'Entity');

        // Convert to StoredEntityData format
        const storedData: StoredEntityData = {
            id: defaultEntity.id,
            name: name  // Use the name from block text instead of default
        };

        // Set up both data and metadata using setElementData
        storageAdapter.setElementData(
            block,
            storedData,
            SimulationObjectType.Entity,
            {
                version: "1.0.0"
            }
        );

        // Now create the EntityLucid instance
        return new EntityLucid(block, storageAdapter);
    }
}