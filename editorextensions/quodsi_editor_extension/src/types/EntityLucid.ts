import { BlockProxy } from 'lucid-extension-sdk';
import { 
    Entity,
    SimulationObjectType,
    ComponentLogger
} from '@quodsi/shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';

// Define a constant for the logger prefix
const LOG_PREFIX = '[EntityLucid]';

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, false);

/**
 * Enable or disable logging for EntityLucid
 */
export const setEntityLucidLogging = (enabled: boolean): void => {
    ComponentLogger.setEnabled(LOG_PREFIX, enabled);
};

interface StoredEntityData {
    id: string;
    name?: string;
}

export class EntityLucid extends SimObjectLucid<Entity> {
    constructor(block: BlockProxy, storageAdapter: StorageAdapter) {
        ComponentLogger.log(LOG_PREFIX, `Constructing EntityLucid for block ID: ${block.id}`);
        super(block, storageAdapter);
    }

    get type(): SimulationObjectType {
        return SimulationObjectType.Entity;
    }

    protected createSimObject(): Entity {
        ComponentLogger.log(LOG_PREFIX, `Creating Entity simulation object for element ID: ${this.platformElementId}`);
        
        // Create entity with element-specific properties
        const entity = new Entity(
            this.platformElementId,
            ''  // name will be set below
        );

        // Get stored custom data
        const storedData = this.storageAdapter.getElementData(this.element) as StoredEntityData;

        if (storedData) {
            ComponentLogger.log(LOG_PREFIX, `Found stored data for element ID: ${this.platformElementId}`, storedData);
            // Only copy name from stored data
            entity.name = storedData.name || this.getElementName('Entity');
        } else {
            ComponentLogger.log(LOG_PREFIX, `No stored data found for element ID: ${this.platformElementId}, using defaults`);
            entity.name = this.getElementName('Entity');
        }

        return entity;
    }

    public updateFromPlatform(): void {
        ComponentLogger.log(LOG_PREFIX, `Updating Entity from platform for element ID: ${this.platformElementId}`);
        
        // Update name only if not already set
        if (!this.simObject.name) {
            this.simObject.name = this.getElementName('Entity');
        }

        // Store custom data properties
        const dataToStore = {
            id: this.platformElementId,
            name: this.simObject.name
        };

        ComponentLogger.log(LOG_PREFIX, `Storing updated data for entity ID: ${this.platformElementId}`, dataToStore);
        this.storageAdapter.updateElementData(this.element, dataToStore);
    }

    protected getElementName(defaultPrefix: string): string {
        const block = this.element as BlockProxy;

        if (block.textAreas && block.textAreas.size > 0) {
            for (const text of block.textAreas.values()) {
                if (text && text.trim()) {
                    const name = text.trim();
                    ComponentLogger.log(LOG_PREFIX, `Using text area content as name for element ID ${block.id}: ${name}`);
                    return name;
                }
            }
        }

        const className = block.getClassName() || 'Block';
        const name = `${defaultPrefix} ${className}`;
        ComponentLogger.log(LOG_PREFIX, `Generated default name for element ID ${block.id}: ${name}`);
        return name;
    }

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter): EntityLucid {
        ComponentLogger.log(LOG_PREFIX, `Creating EntityLucid from conversion for block ID: ${block.id}`);
        
        // Create default entity using the static method from Entity
        const defaultEntity = Entity.createDefault(block.id);
        
        // Get name from block text if available
        const name = SimObjectLucid.getNameFromBlock(block, 'Entity');

        // Convert to StoredEntityData format
        const storedData: StoredEntityData = {
            id: defaultEntity.id,
            name: name  // Use the name from block text instead of default
        };

        ComponentLogger.log(LOG_PREFIX, `Setting initial data for converted entity, block ID: ${block.id}`, storedData);
        
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