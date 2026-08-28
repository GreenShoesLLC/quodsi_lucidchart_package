import { BlockProxy } from 'lucid-extension-sdk';
import {
    Activity,
    Action,
    SimulationObjectType,
    ComponentLogger,
    ActivityFinancialProperties,
    FailureProperties,
    ConnectType,
    parseStructuredName,
    extractActivityFields,
    Duration,
    PeriodUnit,
    ConstantDistribution,
    createDelayAction,
    MappingSource,
    ScenarioLever,
    QueueRanking
} from '@quodsi/lucid-shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';
import { hydrateActions } from './hydrateActions';

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
    // Optional shape dimensions in SVG userSpace (Path X-lite). Captured
    // via block.getBoundingBox(); absent for legacy storage entries.
    width?: number;
    height?: number;
    name?: string;
    description?: string;
    capacity?: number;
    inboundCapacity?: number;
    outboundCapacity?: number;
    actions?: Action[];
    financialProperties?: any;
    failureProperties?: any;
    routing?: string;
    resourceName?: string;  // Resource name to auto-create during conversion
    levers?: ScenarioLever[];
    queueRanking?: QueueRanking;
    /** Opt-in link to a model-level `workSchedules` record (spec 2026-08-27
     *  §3.2). Absence IS the value ("fixed capacity"), which is why it is in
     *  ACTIVITY_CLEARABLE_KEYS below. */
    workScheduleId?: string;
}

/**
 * The only storage keys an Activity write-back is ever allowed to DELETE.
 *
 * queueRanking is one of the few fields where ABSENCE is the value — no key
 * means "first come, first served" — and the generic merge cannot express that.
 * `workScheduleId` (work schedules, spec 2026-08-27 §3.2) is the second: no
 * key means "fixed capacity", and switching CapacitySourcePicker back to
 * Fixed emits `{ workScheduleId: undefined }`, which is invisible by the time
 * it arrives here.
 * StorageAdapter.updateElementData reads the stored q_data, strips
 * undefined-valued keys from the incoming update (deliberately: a partial
 * update must not clobber stored width/height) and merges the rest, so a
 * cleared ranking would silently survive. The panel→extension JSON transport
 * compounds it: `queueRanking: undefined` is dropped before the extension ever
 * sees the key.
 *
 * Scoped to Activity on purpose: the strip loop is correct for everything else,
 * and a global null-means-delete sentinel was rejected as too broad.
 * (86e2qwvf2, final-review finding 1.)
 */
const ACTIVITY_CLEARABLE_KEYS: readonly string[] = ['queueRanking', 'workScheduleId'];

/**
 * Storage keys to delete, given what the writer EXPLICITLY declared cleared.
 *
 * This used to infer the answer from the key being absent in the incoming
 * payload — "no queueRanking key, therefore the user cleared it". That
 * inference was wrong and destructive. Absence also means "this panel never
 * mentions the field", which is exactly what ConnectorsEditor sends: it rebuilds
 * an Activity from connectType + financialProperties alone, and it is reached by
 * selecting ANY connector whose source is an Activity. Under the old rule,
 * clicking such a connector permanently deleted that activity's queue ranking
 * (ElementOpsHandler.handleElementConvert had the same hazard, and before
 * removeKeys existed the merge quietly rescued both).
 *
 * So deletion is now opt-in from the writer, never inferred: a payload that
 * means to clear a field names it in CLEARED_FIELDS_KEY (see
 * `declareClearedFields` in @quodsi/lucid-shared). Only a panel that renders the
 * control, or a write-back built from a fully hydrated simObject, can make that
 * declaration — a partial payload stays silent and its stored value survives.
 *
 * The declaration is filtered here rather than trusted: a payload cannot talk
 * the extension into deleting arbitrary stored keys.
 */
export function activityStorageRemoveKeys(
    clearedFields: readonly string[] | undefined
): readonly string[] {
    if (!clearedFields?.length) {
        return [];
    }
    return ACTIVITY_CLEARABLE_KEYS.filter(key => clearedFields.includes(key));
}

/**
 * The cleared-field declaration an AUTHORITATIVE Activity write-back makes —
 * one built from a fully hydrated Activity (every optional field carried
 * forward), not from a panel's partial view. For such a writer, and only for
 * such a writer, "no ranking on the object" really does mean FIFO.
 */
export function activityAuthoritativeClearedFields(
    activity: { queueRanking?: QueueRanking | null; workScheduleId?: string | null } | null | undefined
): readonly string[] {
    const cleared: string[] = [];
    if (!activity?.queueRanking) cleared.push('queueRanking');
    // Same rule for the work-schedule link: an authoritative write-back
    // hydrated every optional field off storage, so an absent link on the
    // object really does mean "fixed capacity" rather than "this writer has
    // nothing to say". A PANEL payload must never make this declaration --
    // that is what activityStorageRemoveKeys' filtering is for.
    if (!activity?.workScheduleId) cleared.push('workScheduleId');
    return cleared;
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
            storedData?.inboundCapacity ?? 999999,
            storedData?.outboundCapacity ?? 999999,
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

        // Deserialize failure properties
        if (storedData?.failureProperties) {
            activity.failureProperties = FailureProperties.fromJSON(storedData.failureProperties);
        }

        // Restore routing
        if (storedData?.routing) {
            activity.routing = storedData.routing as ConnectType;
        }

        // Carry forward scenario-lever authoring metadata. `levers` is a class
        // field (not a constructor param) defaulting to [], so reconstruction
        // drops it unless copied here -> published model.json loses levers.
        if (storedData?.levers) {
            activity.levers = storedData.levers;
        }

        // Carry forward queue ranking (engine 2026-08-08). Same drop risk as
        // levers: field-by-field hydration loses it unless copied here
        // (86e2qd9np).
        // The work-schedule link (spec 2026-08-27 §3.2). Carried through on
        // every rebuild: an activity linked in Studio, drawio or the embedded
        // Studio surface must keep following its schedule when Lucid rebuilds
        // the model from shape data, and must reach the engine wire (which it
        // does for free -- Activity.toJSON() emits it, omit@absent).
        if (storedData?.workScheduleId) {
            activity.workScheduleId = storedData.workScheduleId;
        }

        if (storedData?.queueRanking) {
            activity.queueRanking = storedData.queueRanking;
        }

        // Update platform-specific fields after creation
        this.updatePlatformSpecificFields(activity);

        return activity;
    }

    private updatePlatformSpecificFields(activity: Activity): void {
        const block = this.element as BlockProxy;

        // Update location AND shape size from current platform (Path X-lite).
        // block.getBoundingBox() returns {x, y, w, h} in SVG userSpace —
        // same coord system the diagram.svg export uses, so the engine
        // can place entity dots accurately on top of activity shapes.
        const box = block.getBoundingBox();
        activity.setLocation(box.x ?? activity.x, box.y ?? activity.y);
        activity.width = box.w;
        activity.height = box.h;

        // Update name if needed
        if (!activity.name || activity.name === 'New Activity') {
            activity.name = this.getElementName('Activity');
        }

        ComponentLogger.log(LOG_PREFIX, 'Updated platform-specific fields', {
            x: activity.x,
            y: activity.y,
            width: activity.width,
            height: activity.height,
            name: activity.name
        });
    }

    public updateFromPlatform(): void {
        ComponentLogger.log(LOG_PREFIX, `Updating Activity from platform for element ID: ${this.platformElementId}`);

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
            this.simObject.name = this.getElementName('Activity');
        }

        // Store updated data
        const dataToStore: StoredActivityData = {
            id: this.platformElementId,
            x: this.simObject.x,     // Store x coordinate
            y: this.simObject.y,     // Store y coordinate
            width: this.simObject.width,
            height: this.simObject.height,
            name: this.simObject.name,
            description: this.simObject.description,
            capacity: this.simObject.capacity,
            inboundCapacity: this.simObject.inboundCapacity,
            outboundCapacity: this.simObject.outboundCapacity,
            actions: this.simObject.actions,
            financialProperties: this.simObject.financialProperties?.toJSON(),
            failureProperties: this.simObject.failureProperties?.toJSON(),
            routing: this.simObject.routing,
            queueRanking: this.simObject.queueRanking,
            workScheduleId: this.simObject.workScheduleId,
            // Levers survive the write-back (conditional — see ActivityLucid).
            levers: this.simObject.levers?.length ? this.simObject.levers : undefined
        };

        ComponentLogger.log(LOG_PREFIX, `Storing updated data for element ID: ${this.platformElementId}`, dataToStore);
        // removeKeys, not just the undefined above: see activityStorageRemoveKeys.
        // This write-back may declare the clear itself — dataToStore is built
        // from this.simObject, which createSimObject hydrated from storage with
        // every optional field (including queueRanking and workScheduleId)
        // carried forward. Unlike
        // a panel payload, its silence about a field is genuine absence.
        this.storageAdapter.updateElementData(this.element, dataToStore, {
            removeKeys: activityStorageRemoveKeys(
                activityAuthoritativeClearedFields(this.simObject)
            )
        });
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

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter, mappingSource?: MappingSource, nameSequence?: number): ActivityLucid {
        ComponentLogger.log(LOG_PREFIX, `Creating ActivityLucid from conversion for block ID: ${block.id}, mappingSource: ${mappingSource}`);

        // Extract location AND shape size (Path X-lite)
        const box = block.getBoundingBox();

        // Create default activity using the static method with location
        const defaultActivity = Activity.createDefault(
            block.id,
            box.x ?? 0,
            box.y ?? 0
        );
        defaultActivity.width = box.w;
        defaultActivity.height = box.h;

        // Get raw name and parse for structured data
        const rawName = SimObjectLucid.pickBlockName(block, {
            typeLabel: 'Activity',
            includeMasterName: true,
            sequence: nameSequence,
        });
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
            const duration = Duration.fromDistribution(
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
            width: defaultActivity.width,
            height: defaultActivity.height,
            capacity: fields.capacity ?? defaultActivity.capacity,
            inboundCapacity: fields.inboundQueueCapacity ?? defaultActivity.inboundCapacity,
            outboundCapacity: fields.outboundQueueCapacity ?? defaultActivity.outboundCapacity,
            actions: actions,
            financialProperties: defaultActivity.financialProperties?.toJSON(),
            failureProperties: defaultActivity.failureProperties?.toJSON(),
            routing: defaultActivity.routing,
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
