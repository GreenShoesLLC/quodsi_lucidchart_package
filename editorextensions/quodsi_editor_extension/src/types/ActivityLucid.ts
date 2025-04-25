import { BlockProxy } from 'lucid-extension-sdk';
import {
    Activity,
    OperationStep,
    SimulationObjectType,
    ComponentLogger
} from '@quodsi/shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';

// Define a constant for the logger prefix
const LOG_PREFIX = '[ActivityLucid]';

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, false);

/**
 * Enable or disable logging for ActivityLucid
 */
export const setActivityLucidLogging = (enabled: boolean): void => {
    ComponentLogger.setEnabled(LOG_PREFIX, enabled);
};

interface StoredActivityData {
    id: string;
    name?: string;
    capacity?: number;
    inputBufferCapacity?: number;
    outputBufferCapacity?: number;
    operationSteps?: OperationStep[];
}

/**
 * Lucid-specific implementation of an Activity.
 * Maps a Lucid Block element to a simulation Activity.
 */
export class ActivityLucid extends SimObjectLucid<Activity> {
    constructor(block: BlockProxy, storageAdapter: StorageAdapter) {
        ComponentLogger.log(LOG_PREFIX, `Constructing ActivityLucid for block ID: ${block.id}`);
        super(block, storageAdapter);
    }

    get type(): SimulationObjectType {
        return SimulationObjectType.Activity;
    }

    protected createSimObject(): Activity {
        ComponentLogger.log(LOG_PREFIX, `Creating Activity simulation object for element ID: ${this.platformElementId}`);
        
        // Always create with element ID
        const activity = new Activity(
            this.platformElementId,  // Always use element ID
            '',                      // Name will be set below
            1,                       // Default capacity
            1,                       // Default inputBufferCapacity
            1,                       // Default outputBufferCapacity
            []                       // Default empty operationSteps
        );

        // Cast the stored data to our interface
        const storedData = this.storageAdapter.getElementData(this.element) as StoredActivityData;

        if (storedData) {
            ComponentLogger.log(LOG_PREFIX, `Found stored data for element ID: ${this.platformElementId}`, storedData);
            // Now TypeScript knows the shape of storedData
            activity.name = storedData.name || this.getElementName('Activity');
            activity.capacity = storedData.capacity ?? 1;
            activity.inputBufferCapacity = storedData.inputBufferCapacity ?? 1;
            activity.outputBufferCapacity = storedData.outputBufferCapacity ?? 1;
            activity.operationSteps = storedData.operationSteps || [];
        } else {
            ComponentLogger.log(LOG_PREFIX, `No stored data found for element ID: ${this.platformElementId}, using defaults`);
            activity.name = this.getElementName('Activity');
        }

        return activity;
    }

    public updateFromPlatform(): void {
        ComponentLogger.log(LOG_PREFIX, `Updating Activity from platform for element ID: ${this.platformElementId}`);
        
        // Update name if not already set
        if (!this.simObject.name) {
            this.simObject.name = this.getElementName('Activity');
        }

        // Store updated data - only store the properties we care about
        const dataToStore = {
            id: this.platformElementId,  // Include the id to satisfy StorageAdapter
            name: this.simObject.name,
            capacity: this.simObject.capacity,
            inputBufferCapacity: this.simObject.inputBufferCapacity,
            outputBufferCapacity: this.simObject.outputBufferCapacity,
            operationSteps: this.simObject.operationSteps
        };

        ComponentLogger.log(LOG_PREFIX, `Storing updated data for element ID: ${this.platformElementId}`, dataToStore);
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
    
    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter): ActivityLucid {
        ComponentLogger.log(LOG_PREFIX, `Creating ActivityLucid from conversion for block ID: ${block.id}`);
        
        // Create default activity using the static method
        const defaultActivity = Activity.createDefault(block.id);
        const name = SimObjectLucid.getNameFromBlock(block, 'Act');
        
        // Convert to StoredActivityData format
        const storedData: StoredActivityData = {
            id: defaultActivity.id,
            name: name,
            capacity: defaultActivity.capacity,
            inputBufferCapacity: defaultActivity.inputBufferCapacity,
            outputBufferCapacity: defaultActivity.outputBufferCapacity,
            operationSteps: defaultActivity.operationSteps
        };

        ComponentLogger.log(LOG_PREFIX, `Setting initial data for converted activity, block ID: ${block.id}`, storedData);
        
        // Set up both data and metadata using setElementData
        storageAdapter.setElementData(
            block,
            storedData,
            SimulationObjectType.Activity,
            {
                version: "1.0.0"
            }
        );

        // Now create the ActivityLucid instance
        return new ActivityLucid(block, storageAdapter);
    }
}