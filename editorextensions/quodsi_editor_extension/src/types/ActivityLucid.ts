import { BlockProxy } from 'lucid-extension-sdk';
import { 
    Activity,
    OperationStep,
    SimulationObjectType 
} from '@quodsi/shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';


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
        super(block, storageAdapter);
    }

    get type(): SimulationObjectType {
        return SimulationObjectType.Activity;
    }

    protected createSimObject(): Activity {
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
            // Now TypeScript knows the shape of storedData
            activity.name = storedData.name || this.getElementName('Activity');
            activity.capacity = storedData.capacity ?? 1;
            activity.inputBufferCapacity = storedData.inputBufferCapacity ?? 1;
            activity.outputBufferCapacity = storedData.outputBufferCapacity ?? 1;
            activity.operationSteps = storedData.operationSteps || [];
        } else {
            activity.name = this.getElementName('Activity');
        }

        return activity;
    }

    public updateFromPlatform(): void {
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
}