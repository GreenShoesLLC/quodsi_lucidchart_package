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
    x?: number;
    y?: number;
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
        
        // Get stored custom data first
        const storedData = this.storageAdapter.getElementData(this.element) as StoredActivityData;

        // Create activity using stored data or defaults
        const activity = new Activity(
            this.platformElementId,
            storedData?.name || 'New Activity',
            storedData?.capacity ?? 1,
            storedData?.inputBufferCapacity ?? 1,
            storedData?.outputBufferCapacity ?? 1,
            storedData?.operationSteps || [],
            storedData?.x ?? 0,
            storedData?.y ?? 0
        );

        // Update platform-specific fields after creation
        this.updatePlatformSpecificFields(activity);

        return activity;
    }

    private updatePlatformSpecificFields(activity: Activity): void {
        const block = this.element as BlockProxy;
        
        // Update location from current platform
        const location = block.getLocation();
        activity.setLocation(location.x ?? activity.x, location.y ?? activity.y);

        // Update name if needed
        if (!activity.name || activity.name === 'New Activity') {
            activity.name = this.getElementName('Activity');
        }

        ComponentLogger.log(LOG_PREFIX, 'Updated platform-specific fields', {
            x: activity.x,
            y: activity.y,
            name: activity.name
        });
    }

    public updateFromPlatform(): void {
        ComponentLogger.log(LOG_PREFIX, `Updating Activity from platform for element ID: ${this.platformElementId}`);
        
        // Extract location from platform
        const location = (this.element as BlockProxy).getLocation();
        
        // Update location
        this.simObject.setLocation(
            location.x ?? this.simObject.x, 
            location.y ?? this.simObject.y
        );

        // Update name if not already set
        if (!this.simObject.name) {
            this.simObject.name = this.getElementName('Activity');
        }

        // Store updated data
        const dataToStore: StoredActivityData = {
            id: this.platformElementId,
            x: this.simObject.x,     // Store x coordinate
            y: this.simObject.y,     // Store y coordinate
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

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter): ActivityLucid {
        ComponentLogger.log(LOG_PREFIX, `Creating ActivityLucid from conversion for block ID: ${block.id}`);
        
        // Extract location
        const location = block.getLocation();
        
        // Create default activity using the static method with location
        const defaultActivity = Activity.createDefault(
            block.id, 
            location.x ?? 0, 
            location.y ?? 0
        );
        
        const name = SimObjectLucid.getNameFromBlock(block, 'Act');

        // Convert to StoredActivityData format
        const storedData: StoredActivityData = {
            id: defaultActivity.id,
            name: name,
            x: defaultActivity.x,
            y: defaultActivity.y,
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