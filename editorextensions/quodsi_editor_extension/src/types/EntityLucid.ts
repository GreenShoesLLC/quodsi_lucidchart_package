import { BlockProxy } from 'lucid-extension-sdk';
import {
    Entity,
    SimulationObjectType,
    ComponentLogger,
    parseStructuredName,
    extractEntityFields,
    MappingSource
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
    x?: number;  // Added x coordinate
    y?: number;  // Added y coordinate
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
        
        // Get stored custom data first
        const storedData = this.storageAdapter.getElementData(this.element) as StoredEntityData;

        // Create entity using stored data or defaults
        const entity = new Entity(
            this.platformElementId,
            storedData?.name || 'New Entity',
            storedData?.x ?? 0,
            storedData?.y ?? 0
        );

        // Update platform-specific fields after creation
        this.updatePlatformSpecificFields(entity);

        return entity;
    }

    private updatePlatformSpecificFields(entity: Entity): void {
        const block = this.element as BlockProxy;
        
        // Update location from current platform
        const location = block.getLocation();
        entity.setLocation(location.x ?? entity.x, location.y ?? entity.y);

        // Update name if needed
        if (!entity.name || entity.name === 'New Entity') {
            entity.name = this.getElementName('Entity');
        }

        ComponentLogger.log(LOG_PREFIX, 'Updated platform-specific fields', {
            x: entity.x,
            y: entity.y,
            name: entity.name
        });
    }

    public updateFromPlatform(): void {
        ComponentLogger.log(LOG_PREFIX, `Updating Entity from platform for element ID: ${this.platformElementId}`);
        
        // Extract location from platform
        const location = (this.element as BlockProxy).getLocation();
        
        // Update location
        this.simObject.setLocation(
            location.x ?? this.simObject.x, 
            location.y ?? this.simObject.y
        );

        // Update name if not already set
        if (!this.simObject.name) {
            this.simObject.name = this.getElementName('Entity');
        }

        // Store updated data
        const dataToStore: StoredEntityData = {
            id: this.platformElementId,
            x: this.simObject.x,     // Store x coordinate
            y: this.simObject.y,     // Store y coordinate
            name: this.simObject.name
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

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter, mappingSource?: MappingSource): EntityLucid {
        ComponentLogger.log(LOG_PREFIX, `Creating EntityLucid from conversion for block ID: ${block.id}, mappingSource: ${mappingSource}`);

        // Extract location
        const location = block.getLocation();

        // Create default entity using the static method with location
        const defaultEntity = Entity.createDefault(
            block.id,
            location.x ?? 0,
            location.y ?? 0
        );

        // Get raw name and parse for structured data
        const rawName = SimObjectLucid.getNameFromBlock(block, 'Entity');
        const parsed = parseStructuredName(rawName);
        const fields = extractEntityFields(parsed);

        ComponentLogger.log(LOG_PREFIX, `Parsed structured name for block ${block.id}:`, { rawName, fields });

        // Update shape text to clean name if we parsed structured data
        if (rawName.includes('|') && fields.name) {
            SimObjectLucid.updateBlockText(block, fields.name);
        }

        // Convert to StoredEntityData format, using parsed values where available
        const storedData: StoredEntityData = {
            id: defaultEntity.id,
            name: fields.name || rawName,
            x: defaultEntity.x,
            y: defaultEntity.y
        };

        ComponentLogger.log(LOG_PREFIX, `Setting initial data for converted entity, block ID: ${block.id}`, storedData);

        // Set up element data (type + component data merged into single q_data)
        storageAdapter.setElementData(
            block,
            storedData,
            SimulationObjectType.Entity,
            {
                mappingSource: mappingSource
            }
        );

        // Now create the EntityLucid instance
        return new EntityLucid(block, storageAdapter);
    }
}