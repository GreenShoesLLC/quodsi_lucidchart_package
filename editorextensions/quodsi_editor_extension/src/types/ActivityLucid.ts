import { BlockProxy } from 'lucid-extension-sdk';
import {
    Activity,
    Action,
    ActionType,
    SimulationObjectType,
    ComponentLogger,
    ActivityFinancialProperties,
    ConnectType,
    parseStructuredName,
    extractActivityFields,
    Duration,
    PeriodUnit,
    ConstantDistribution,
    createDelayAction,
    MappingSource,
    StateModification
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
    description?: string;
    capacity?: number;
    inboundQueueCapacity?: number;
    outboundQueueCapacity?: number;
    actions?: Action[];
    financialProperties?: any;
    connectType?: string;
    resourceName?: string;  // Resource name to auto-create during conversion
}

/**
 * Hydrate a single modification object to a StateModification instance.
 * This handles cases where modifications are loaded from storage as plain objects.
 */
function hydrateModification(m: any): StateModification {
    if (m instanceof StateModification) {
        return m;
    }
    return StateModification.fromJSON(m);
}

/**
 * Hydrate actions loaded from storage.
 * Converts plain modification objects back to StateModification instances.
 */
function hydrateActions(actions: Action[] | undefined): Action[] {
    if (!actions) {
        return [];
    }

    return actions.map(action => {
        if (action.actionType === ActionType.ASSIGN) {
            const assignAction = action as any;
            return {
                ...action,
                modifications: assignAction.modifications?.map(hydrateModification) || []
            };
        }
        if (action.actionType === ActionType.DELAY_WITH_RESOURCE) {
            const delayAction = action as any;
            return {
                ...action,
                stateModifications: delayAction.stateModifications?.map(hydrateModification) || []
            };
        }
        if (action.actionType === ActionType.SPLIT) {
            const splitAction = action as any;
            return {
                ...action,
                modifications: splitAction.modifications?.map(hydrateModification) || []
            };
        }
        return action;
    });
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

        // Hydrate actions to ensure StateModification instances are properly reconstructed
        const hydratedActions = hydrateActions(storedData?.actions);

        // Create activity using stored data or defaults
        // Note: null queue capacities mean "unlimited" - use 999999 (not 1) for backwards compatibility
        const activity = new Activity(
            this.platformElementId,
            storedData?.name || 'New Activity',
            storedData?.capacity ?? 1,
            storedData?.inboundQueueCapacity ?? 999999,
            storedData?.outboundQueueCapacity ?? 999999,
            hydratedActions,
            storedData?.x ?? 0,
            storedData?.y ?? 0
        );

        // Restore description
        if (storedData?.description !== undefined) {
            activity.description = storedData.description;
        }

        // Deserialize financial properties
        if (storedData?.financialProperties) {
            activity.financialProperties = ActivityFinancialProperties.fromJSON(storedData.financialProperties);
        }

        // Restore connectType
        if (storedData?.connectType) {
            activity.connectType = storedData.connectType as ConnectType;
        }

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
            description: this.simObject.description,
            capacity: this.simObject.capacity,
            inboundQueueCapacity: this.simObject.inboundQueueCapacity,
            outboundQueueCapacity: this.simObject.outboundQueueCapacity,
            actions: this.simObject.actions,
            financialProperties: this.simObject.financialProperties?.toJSON(),
            connectType: this.simObject.connectType
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

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter, mappingSource?: MappingSource): ActivityLucid {
        ComponentLogger.log(LOG_PREFIX, `Creating ActivityLucid from conversion for block ID: ${block.id}, mappingSource: ${mappingSource}`);

        // Extract location
        const location = block.getLocation();

        // Create default activity using the static method with location
        const defaultActivity = Activity.createDefault(
            block.id,
            location.x ?? 0,
            location.y ?? 0
        );

        // Get raw name and parse for structured data
        const rawName = SimObjectLucid.getNameFromBlock(block, 'Act');
        const parsed = parseStructuredName(rawName);
        const fields = extractActivityFields(parsed);

        ComponentLogger.log(LOG_PREFIX, `Parsed structured name for block ${block.id}:`, { rawName, fields });

        // Update shape text to clean name if we parsed structured data
        if (rawName.includes('|') && fields.name) {
            SimObjectLucid.updateBlockText(block, fields.name);
        }

        // Determine actions - use parsed duration if provided
        let actions = defaultActivity.actions;
        if (fields.duration !== undefined) {
            const duration = new Duration(
                PeriodUnit.MINUTES,
                ConstantDistribution.create(fields.duration)
            );
            actions = [createDelayAction(duration)];
            ComponentLogger.log(LOG_PREFIX, `Using parsed duration: ${fields.duration} minutes`);
        }

        // Convert to StoredActivityData format, using parsed values where available
        const storedData: StoredActivityData = {
            id: defaultActivity.id,
            name: fields.name || rawName,
            x: defaultActivity.x,
            y: defaultActivity.y,
            capacity: fields.capacity ?? defaultActivity.capacity,
            inboundQueueCapacity: fields.inboundQueueCapacity ?? defaultActivity.inboundQueueCapacity,
            outboundQueueCapacity: fields.outboundQueueCapacity ?? defaultActivity.outboundQueueCapacity,
            actions: actions,
            financialProperties: defaultActivity.financialProperties?.toJSON(),
            connectType: defaultActivity.connectType,
            resourceName: fields.resource  // Store for auto-creation during conversion
        };

        ComponentLogger.log(LOG_PREFIX, `Setting initial data for converted activity, block ID: ${block.id}`, storedData);

        // Set up element data (type + component data merged into single q_data)
        storageAdapter.setElementData(
            block,
            storedData,
            SimulationObjectType.Activity,
            {
                mappingSource: mappingSource
            }
        );

        // Now create the ActivityLucid instance
        return new ActivityLucid(block, storageAdapter);
    }
}