import { ElementProxy, PageProxy } from 'lucid-extension-sdk';
import { SimulationObjectType, ISerializedState, ISerializedEntity, ISerializedArrivalPattern, ISerializedArrivalSchedule, ISerializedWorkSchedule, ISerializedResourceRequirement, MappingSource, ElementTypeInfo, MODEL_SCHEMA_VERSION, flattenEnvelope, makeEnvelope, getLogger } from '@quodsi/lucid-shared';
import { StoredResourceRecord } from './StoredResourceRecord';

const log = getLogger('StorageAdapter');

/**
 * Record of skipped elements with their mapping source
 */
export type SkippedElementsRecord = Record<string, MappingSource>;

export class StorageAdapter {
    private static readonly DATA_KEY = 'q_data';
    private static readonly SIMULATION_STATUS_KEY = 'q_simulation_status';
    private static readonly STATES_KEY = 'q_states';
    private static readonly ENTITIES_KEY = 'q_entities';
    private static readonly ARRIVAL_PATTERNS_KEY = 'q_arrival_patterns';
    private static readonly ARRIVAL_SCHEDULES_KEY = 'q_arrival_schedules';
    private static readonly WORK_SCHEDULES_KEY = 'q_work_schedules';
    private static readonly RESOURCE_REQUIREMENTS_KEY = 'q_res_requirements';
    private static readonly SKIPPED_ELEMENTS_KEY = 'q_skipped_elements';
    // Legacy: pages once stored a scenario list here. Scenarios now live in the
    // database; the key is only cleared (clearAllModelData) so old pages tidy up.
    private static readonly SCENARIOS_KEY = 'q_scenarios';
    private static readonly SWIMLANE_DATA_KEY = 'q_swimlane';
    private static readonly RESOURCES_KEY = 'q_resources';
    private static readonly STORAGE_FORMAT_KEY = 'q_lucid_format';

    constructor() {
        log.trace('StorageAdapter initialized');
    }

    /**
     * Checks if an element has been converted to a Quodsi model element
     */
    public isQuodsiModel(element: ElementProxy): boolean {
        try {
            const typeInfo = this.getElementType(element);
            return typeInfo !== null && typeInfo.type === SimulationObjectType.Model;
        } catch (error) {
            log.error('Error checking model status:', error);
            return false;
        }
    }

    /**
     * Checks if a page is a Quodsi page (has Model type in q_data)
     */
    public isQuodsiPage(page: ElementProxy): boolean {
        return this.isQuodsiModel(page);
    }

    /**
     * Gets the model version from the page's q_data
     */
    public getModelVersion(page: ElementProxy): string | null {
        try {
            const dataStr = page.shapeData.get(StorageAdapter.DATA_KEY);
            if (!dataStr || typeof dataStr !== 'string') return null;
            const data = JSON.parse(dataStr);
            return data.version || null;
        } catch (error) {
            log.error('Error getting model version:', error);
            return null;
        }
    }

    /**
     * Clears the legacy page-level simulation status (q_simulation_status).
     * Nothing writes it any more; it is cleared so old pages tidy up.
     */
    public clearSimulationStatus(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.SIMULATION_STATUS_KEY);
            log.trace('Successfully cleared simulation status');
        } catch (error) {
            log.error('Error clearing simulation status:', error);
            throw error;
        }
    }

    /**
     * Sets the states array for a page
     */
    public setStates(page: ElementProxy, states: ISerializedState[]): void {
        try {
            log.trace('Setting states for page:', {
                pageId: page.id,
                statesCount: states.length
            });
            const serializedStates = JSON.stringify(states);
            page.shapeData.set(StorageAdapter.STATES_KEY, serializedStates);
            log.trace('Successfully set states');
        } catch (error) {
            log.error('Error setting states:', error);
            throw error;
        }
    }

    /**
     * Gets the states array for a page
     */
    public getStates(page: ElementProxy): ISerializedState[] {
        try {
            log.trace('Getting states for page:', page.id);
            const statesStr = page.shapeData.get(StorageAdapter.STATES_KEY);
            if (!statesStr || typeof statesStr !== 'string') {
                log.trace('No states found, returning empty array');
                return [];
            }
            const states = JSON.parse(statesStr) as ISerializedState[];
            log.trace('Retrieved states:', { count: states.length });
            return states;
        } catch (error) {
            log.error('Error getting states:', error);
            return [];
        }
    }

    /**
     * Clears the states array for a page
     */
    public clearStates(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.STATES_KEY);
            log.trace('Successfully cleared states');
        } catch (error) {
            log.error('Error clearing states:', error);
            throw error;
        }
    }

    /**
     * Sets the entities array for a page
     */
    public setEntities(page: ElementProxy, entities: ISerializedEntity[]): void {
        try {
            log.trace('Setting entities for page:', {
                pageId: page.id,
                entitiesCount: entities.length
            });
            const serializedEntities = JSON.stringify(entities);
            page.shapeData.set(StorageAdapter.ENTITIES_KEY, serializedEntities);
            log.trace('Successfully set entities');
        } catch (error) {
            log.error('Error setting entities:', error);
            throw error;
        }
    }

    /**
     * Gets the entities array for a page
     */
    public getEntities(page: ElementProxy): ISerializedEntity[] {
        try {
            log.trace('Getting entities for page:', page.id);
            const entitiesStr = page.shapeData.get(StorageAdapter.ENTITIES_KEY);
            if (!entitiesStr || typeof entitiesStr !== 'string') {
                log.trace('No entities found, returning empty array');
                return [];
            }
            const entities = JSON.parse(entitiesStr) as ISerializedEntity[];
            log.trace('Retrieved entities:', { count: entities.length });
            return entities;
        } catch (error) {
            log.error('Error getting entities:', error);
            return [];
        }
    }

    /**
     * Clears the entities array for a page
     */
    public clearEntities(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.ENTITIES_KEY);
            log.trace('Successfully cleared entities');
        } catch (error) {
            log.error('Error clearing entities:', error);
            throw error;
        }
    }

    public setResources(page: ElementProxy, resources: StoredResourceRecord[]): void {
        try {
            page.shapeData.set(StorageAdapter.RESOURCES_KEY, JSON.stringify(resources));
            log.trace('Set resources', { pageId: page.id, count: resources.length });
        } catch (error) {
            log.error('Error setting resources:', error);
            throw error;
        }
    }

    public getResources(page: ElementProxy): StoredResourceRecord[] {
        try {
            const str = page.shapeData.get(StorageAdapter.RESOURCES_KEY);
            if (!str || typeof str !== 'string') return [];
            const parsed = JSON.parse(str);
            return Array.isArray(parsed) ? (parsed as StoredResourceRecord[]) : [];
        } catch (error) {
            log.error('Error getting resources:', error);
            return [];
        }
    }

    public clearResources(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.RESOURCES_KEY);
        } catch (error) {
            log.error('Error clearing resources:', error);
            throw error;
        }
    }

    /** Integer from `q_lucid_format`, or null when absent / not an integer. */
    public getStorageFormat(page: ElementProxy): number | null {
        const str = page.shapeData.get(StorageAdapter.STORAGE_FORMAT_KEY);
        if (typeof str !== 'string' || !/^\d+$/.test(str)) return null;
        return parseInt(str, 10);
    }

    public setStorageFormat(page: ElementProxy, format: number): void {
        page.shapeData.set(StorageAdapter.STORAGE_FORMAT_KEY, String(format));
    }

    /**
     * Sets the arrival-pattern list for a page.
     *
     * Model-level list, sibling of q_entities — NOT shape-mapped.
     * One pattern per generator is enforced by the UI, not here.
     */
    public setArrivalPatterns(page: ElementProxy, patterns: ISerializedArrivalPattern[]): void {
        try {
            log.trace('Setting arrival patterns for page:', {
                pageId: page.id,
                patternsCount: patterns.length
            });
            page.shapeData.set(StorageAdapter.ARRIVAL_PATTERNS_KEY, JSON.stringify(patterns));
            log.trace('Successfully set arrival patterns');
        } catch (error) {
            log.error('Error setting arrival patterns:', error);
            throw error;
        }
    }

    /**
     * Gets the arrival-pattern list for a page. Returns [] rather than
     * throwing on corrupt data — an unreadable pattern list must not stop the
     * whole page from loading.
     */
    public getArrivalPatterns(page: ElementProxy): ISerializedArrivalPattern[] {
        try {
            const raw = page.shapeData.get(StorageAdapter.ARRIVAL_PATTERNS_KEY);
            if (!raw || typeof raw !== 'string') {
                log.trace('No arrival patterns found, returning empty array');
                return [];
            }
            const patterns = JSON.parse(raw) as ISerializedArrivalPattern[];
            log.trace('Retrieved arrival patterns:', { count: patterns.length });
            return patterns;
        } catch (error) {
            log.error('Error getting arrival patterns:', error);
            return [];
        }
    }

    /**
     * Clears the arrival-pattern list for a page.
     */
    public clearArrivalPatterns(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.ARRIVAL_PATTERNS_KEY);
            log.trace('Successfully cleared arrival patterns');
        } catch (error) {
            log.error('Error clearing arrival patterns:', error);
            throw error;
        }
    }

    /**
     * Sets the arrival-schedule list for a page.
     *
     * Model-level list, sibling of q_entities/q_arrival_patterns — NOT
     * shape-mapped. One schedule per generator is enforced by the UI, not
     * here.
     */
    public setArrivalSchedules(page: ElementProxy, schedules: ISerializedArrivalSchedule[]): void {
        try {
            log.trace('Setting arrival schedules for page:', {
                pageId: page.id,
                schedulesCount: schedules.length
            });
            page.shapeData.set(StorageAdapter.ARRIVAL_SCHEDULES_KEY, JSON.stringify(schedules));
            log.trace('Successfully set arrival schedules');
        } catch (error) {
            log.error('Error setting arrival schedules:', error);
            throw error;
        }
    }

    /**
     * Gets the arrival-schedule list for a page. Returns [] rather than
     * throwing on corrupt data — an unreadable schedule list must not stop
     * the whole page from loading.
     */
    public getArrivalSchedules(page: ElementProxy): ISerializedArrivalSchedule[] {
        try {
            const raw = page.shapeData.get(StorageAdapter.ARRIVAL_SCHEDULES_KEY);
            if (!raw || typeof raw !== 'string') {
                log.trace('No arrival schedules found, returning empty array');
                return [];
            }
            const schedules = JSON.parse(raw) as ISerializedArrivalSchedule[];
            log.trace('Retrieved arrival schedules:', { count: schedules.length });
            return schedules;
        } catch (error) {
            log.error('Error getting arrival schedules:', error);
            return [];
        }
    }

    /**
     * Clears the arrival-schedule list for a page.
     */
    public clearArrivalSchedules(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.ARRIVAL_SCHEDULES_KEY);
            log.trace('Successfully cleared arrival schedules');
        } catch (error) {
            log.error('Error clearing arrival schedules:', error);
            throw error;
        }
    }

    /**
     * Sets the work-schedule list for a page (spec 2026-08-27 §3.1).
     *
     * Model-level list, sibling of q_entities/q_arrival_schedules -- NOT
     * shape-mapped. Unlike an arrival schedule, a work schedule is SHARED:
     * any number of Resources and Activities may follow one, so there is no
     * one-owner rule for the UI to enforce.
     *
     * The class `type` tag is STRIPPED before storing. WorkSchedule.type is
     * SimulationObjectType.None (the same pre-existing quirk State /
     * ArrivalPattern / ArrivalSchedule carry) and the engine's
     * CleanWorkScheduleDoc -- an `extra="forbid"` parser -- has no slot for
     * it, so a leaked tag makes the whole document unparseable. `toJSON()`
     * already omits it, but a record can also arrive here straight off a
     * panel patch (`updateModel({ workSchedules })` forwards whole plain
     * objects verbatim), and drawio demonstrably does leak it that way. One
     * cheap strip at the storage boundary closes the whole class of leak.
     */
    public setWorkSchedules(page: ElementProxy, schedules: ISerializedWorkSchedule[]): void {
        try {
            log.trace('Setting work schedules for page:', {
                pageId: page.id,
                schedulesCount: schedules.length
            });
            const clean = (schedules ?? []).map(schedule => {
                const { type: _type, ...rest } = schedule as ISerializedWorkSchedule & { type?: unknown };
                return rest;
            });
            page.shapeData.set(StorageAdapter.WORK_SCHEDULES_KEY, JSON.stringify(clean));
            log.trace('Successfully set work schedules');
        } catch (error) {
            log.error('Error setting work schedules:', error);
            throw error;
        }
    }

    /**
     * Gets the work-schedule list for a page. Returns [] rather than throwing
     * on corrupt data -- an unreadable schedule list must not stop the whole
     * page from loading.
     */
    public getWorkSchedules(page: ElementProxy): ISerializedWorkSchedule[] {
        try {
            const raw = page.shapeData.get(StorageAdapter.WORK_SCHEDULES_KEY);
            if (!raw || typeof raw !== 'string') {
                log.trace('No work schedules found, returning empty array');
                return [];
            }
            const schedules = JSON.parse(raw) as ISerializedWorkSchedule[];
            log.trace('Retrieved work schedules:', { count: schedules.length });
            return schedules;
        } catch (error) {
            log.error('Error getting work schedules:', error);
            return [];
        }
    }

    /**
     * Clears the work-schedule list for a page.
     */
    public clearWorkSchedules(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.WORK_SCHEDULES_KEY);
            log.trace('Successfully cleared work schedules');
        } catch (error) {
            log.error('Error clearing work schedules:', error);
            throw error;
        }
    }

    /**
     * Clears the scenarios array for a page
     */
    public clearScenarios(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.SCENARIOS_KEY);
            log.trace('Successfully cleared scenarios');
        } catch (error) {
            log.error('Error clearing scenarios:', error);
            throw error;
        }
    }

    /**
     * Sets the resource requirements array for a page
     */
    public setResourceRequirements(page: ElementProxy, requirements: ISerializedResourceRequirement[]): void {
        try {
            log.trace('Setting resource requirements for page:', {
                pageId: page.id,
                requirementsCount: requirements.length
            });
            const serializedRequirements = JSON.stringify(requirements);
            page.shapeData.set(StorageAdapter.RESOURCE_REQUIREMENTS_KEY, serializedRequirements);
            log.trace('Successfully set resource requirements');
        } catch (error) {
            log.error('Error setting resource requirements:', error);
            throw error;
        }
    }

    /**
     * Gets the resource requirements array for a page
     */
    public getResourceRequirements(page: ElementProxy): ISerializedResourceRequirement[] {
        try {
            log.trace('Getting resource requirements for page:', page.id);
            const requirementsStr = page.shapeData.get(StorageAdapter.RESOURCE_REQUIREMENTS_KEY);
            if (!requirementsStr || typeof requirementsStr !== 'string') {
                log.trace('No resource requirements found, returning empty array');
                return [];
            }
            const requirements = JSON.parse(requirementsStr) as ISerializedResourceRequirement[];
            log.trace('Retrieved resource requirements:', { count: requirements.length });
            return requirements;
        } catch (error) {
            log.error('Error getting resource requirements:', error);
            return [];
        }
    }

    /**
     * Clears the resource requirements array for a page
     */
    public clearResourceRequirements(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.RESOURCE_REQUIREMENTS_KEY);
            log.trace('Successfully cleared resource requirements');
        } catch (error) {
            log.error('Error clearing resource requirements:', error);
            throw error;
        }
    }

    /**
     * Sets the skipped elements record for a page
     * @param page The page element
     * @param skipped Record of element IDs to their mapping source ('auto' or 'user')
     */
    public setSkippedElements(page: ElementProxy, skipped: SkippedElementsRecord): void {
        try {
            log.trace('Setting skipped elements for page:', {
                pageId: page.id,
                count: Object.keys(skipped).length
            });
            const serialized = JSON.stringify(skipped);
            page.shapeData.set(StorageAdapter.SKIPPED_ELEMENTS_KEY, serialized);
            log.trace('Successfully set skipped elements');
        } catch (error) {
            log.error('Error setting skipped elements:', error);
            throw error;
        }
    }

    /**
     * Gets the skipped elements record for a page
     */
    public getSkippedElements(page: ElementProxy): SkippedElementsRecord {
        try {
            log.trace('Getting skipped elements for page:', page.id);
            const str = page.shapeData.get(StorageAdapter.SKIPPED_ELEMENTS_KEY);
            if (!str || typeof str !== 'string') {
                log.trace('No skipped elements found, returning empty record');
                return {};
            }
            const skipped = JSON.parse(str) as SkippedElementsRecord;
            log.trace('Retrieved skipped elements:', { count: Object.keys(skipped).length });
            return skipped;
        } catch (error) {
            log.error('Error getting skipped elements:', error);
            return {};
        }
    }

    /**
     * Clears the skipped elements record for a page
     */
    public clearSkippedElements(page: ElementProxy): void {
        try {
            page.shapeData.delete(StorageAdapter.SKIPPED_ELEMENTS_KEY);
            log.trace('Successfully cleared skipped elements');
        } catch (error) {
            log.error('Error clearing skipped elements:', error);
            throw error;
        }
    }

    /**
     * Sets element data as a single q_data key containing type, id, mappingSource, and all component data.
     * For Model (page) elements, also includes version.
     */
    public setElementData<T extends { id: string }>(
        element: ElementProxy,
        data: T,
        type: SimulationObjectType,
        options: { mappingSource?: MappingSource; version?: string } = {}
    ): void {
        try {
            // Strip identity/platform/version/schemaVersion; whatever remains is domain.
            const { id, type: _type, mappingSource: _ms, version: _ver, schemaVersion: _sv, ...domain } = data as any;

            const platform: { mappingSource?: MappingSource } = {};
            if (options.mappingSource) platform.mappingSource = options.mappingSource;

            const envelope: any = makeEnvelope(type, id, domain, platform, MODEL_SCHEMA_VERSION);
            // The page (Model) keeps a top-level version marker for the migration gate.
            if (type === SimulationObjectType.Model) {
                envelope.version = options.version || MODEL_SCHEMA_VERSION;
            }

            element.shapeData.set(StorageAdapter.DATA_KEY, JSON.stringify(envelope));

            log.trace('Successfully set element data:', {
                elementId: id,
                type: type,
                dataKeys: Object.keys(domain)
            });
        } catch (error) {
            log.error('Error setting element data:', error);
            throw error;
        }
    }

    /**
     * Updates the data portion of an element's storage.
     * Reads existing q_data, merges updates, writes back.
     *
     * `options.removeKeys` is the escape hatch for fields where ABSENCE is the
     * meaningful value. A merge cannot express deletion: the strip loop below
     * drops undefined-valued keys on purpose (a partial update must not clobber
     * stored width/height), and the panel→extension JSON transport has already
     * dropped undefined-valued keys before we ever see them — so "the user
     * cleared this" and "the panel did not mention this" arrive identical.
     * Callers that can tell the two apart name the keys to delete outright.
     * Opt-in: every existing caller keeps the merge-only behaviour.
     */
    public updateElementData<T extends { id: string }>(
        element: ElementProxy,
        data: T,
        options: { removeKeys?: readonly string[] } = {}
    ): void {
        try {
            // getElementData returns a flattened view of either an envelope or a legacy blob.
            const existing = this.getElementData<any>(element);
            if (!existing) {
                throw new Error('No existing data found for element');
            }

            const type = existing.type as SimulationObjectType;
            // A partial update must not clobber stored values with undefined
            // (e.g. a panel-supplied domain object whose width/height are unset).
            const defined: any = {};
            for (const k of Object.keys(data as any)) {
                if ((data as any)[k] !== undefined) defined[k] = (data as any)[k];
            }
            const merged: any = { ...existing, ...defined, type, id: existing.id };
            // Deletion the merge above cannot express — see the doc comment.
            for (const key of options.removeKeys ?? []) {
                delete merged[key];
            }

            const mappingSource: MappingSource | undefined = merged.mappingSource;

            // flattenEnvelope already surfaces the page version marker into `existing`.
            const pageVersion: string | undefined = type === SimulationObjectType.Model
                ? (existing.version as string | undefined)
                : undefined;

            const { id, type: _t, mappingSource: _m, version: _v, schemaVersion: _s, ...domain } = merged;
            const platform: { mappingSource?: MappingSource } = {};
            if (mappingSource) platform.mappingSource = mappingSource;

            const envelope: any = makeEnvelope(type, existing.id, domain, platform, MODEL_SCHEMA_VERSION);
            if (type === SimulationObjectType.Model) {
                envelope.version = pageVersion || MODEL_SCHEMA_VERSION;
            }

            element.shapeData.set(StorageAdapter.DATA_KEY, JSON.stringify(envelope));

            log.trace('Successfully updated element data:', {
                elementId: existing.id,
                type
            });
        } catch (error) {
            log.error('Error updating element data:', error);
            throw new Error(`Failed to update element data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Gets the element type info from q_data.
     * Returns { type, id, mappingSource } extracted from the stored data.
     * Replaces the old getMetadata() method.
     */
    public getElementType(element: ElementProxy): ElementTypeInfo | null {
        try {
            const dataStr = element.shapeData.get(StorageAdapter.DATA_KEY);
            if (!dataStr || typeof dataStr !== 'string') return null;

            const data = JSON.parse(dataStr);
            if (!data.type) return null;

            // mappingSource lives in platform on an envelope, top-level on a legacy blob.
            const mappingSource = data.platform ? data.platform.mappingSource : data.mappingSource;

            return {
                type: data.type as SimulationObjectType,
                id: data.id || element.id,
                mappingSource
            };
        } catch (error) {
            log.error('Error getting element type:', error);
            return null;
        }
    }

    /**
     * Retrieves data portion for an element
     */
    public getElementData<T>(element: ElementProxy): T | null {
        try {
            log.trace('Getting element data:', {
                elementId: element.id,
                elementType: typeof element,
                contextInfo: 'Attempting to retrieve stored data'
            });

            const dataStr = element.shapeData.get(StorageAdapter.DATA_KEY);

            log.trace('Raw data string:', {
                exists: !!dataStr,
                isString: typeof dataStr === 'string',
                valueType: typeof dataStr,
                preview: typeof dataStr === 'string' ?
                    `${dataStr.slice(0, 100)}${dataStr.length > 100 ? '...' : ''}` :
                    String(dataStr)
            });

            if (!dataStr || typeof dataStr !== 'string') {
                log.trace('No valid data found for element:', element.id);
                return null;
            }

            const parsedData = flattenEnvelope(JSON.parse(dataStr)) as T;

            log.trace('Successfully parsed element data:', {
                elementId: element.id,
                parsedDataKeys: Object.keys(parsedData as object),
                timestamp: new Date().toISOString()
            });

            return parsedData;
        } catch (error) {
            log.error('Error getting element data:', {
                elementId: element.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    /**
     * Removes all Quodsi-related data from an element
     */
    public clearElementData(element: ElementProxy): void {
        try {
            const key = StorageAdapter.DATA_KEY;
            const value = element.shapeData.get(key);
            if (value !== undefined) {
                try {
                    element.shapeData.delete(key);
                } catch {
                    // If delete fails, try setting to empty string as fallback
                    element.shapeData.set(key, '');
                }
                log.trace(`Cleared ${key} from element:`, element.id);
            } else {
                log.trace(`No ${key} found on element:`, element.id);
            }
        } catch (error) {
            log.error('Error clearing element data:', error);
            throw new Error(`Failed to clear element data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Clears a specific shapeData key from an element, if present.
     */
    private clearShapeDataKey(element: ElementProxy, key: string): void {
        try {
            const value = element.shapeData.get(key);
            if (value !== undefined) {
                try {
                    element.shapeData.delete(key);
                } catch {
                    element.shapeData.set(key, '');
                }
                log.trace(`Cleared ${key} from element:`, element.id);
            }
        } catch (error) {
            log.error(`Error clearing ${key}:`, error);
        }
    }

    public clearAllModelData(page: PageProxy): void {
        try {
            // Clear model data from page
            this.clearElementData(page);
            this.clearSimulationStatus(page);
            this.clearStates(page);
            this.clearEntities(page);
            this.clearArrivalPatterns(page);
            this.clearArrivalSchedules(page);
            this.clearWorkSchedules(page);
            this.clearResourceRequirements(page);
            // NOTE: q_time_patterns / q_time_distributed_configs are intentionally
            // NOT cleared here. The time-distributed generator feature was retired
            // (Task 21, 2026-08-12); any such keys left over in older documents are
            // orphaned dead data — nothing reads them anymore, so leaving them in
            // place on an explicit "clear model" is harmless and avoids resurrecting
            // deleted read/write code paths just to delete a key.
            this.clearScenarios(page);
            this.clearSkippedElements(page);
            this.clearResources(page);
            this.clearShapeDataKey(page, StorageAdapter.STORAGE_FORMAT_KEY);

            // Clear data from all blocks (q_data and q_swimlane)
            for (const [, block] of page.allBlocks) {
                this.clearElementData(block);
                this.clearShapeDataKey(block, StorageAdapter.SWIMLANE_DATA_KEY);
            }

            // Clear data from all lines
            for (const [, line] of page.allLines) {
                this.clearElementData(line);
            }
        } catch (error) {
            log.error('Error clearing model data:', error);
            throw error;
        }
    }
}
