// Lucid storage format 1 -> 2: resources move off Resource blocks' q_data
// and out of q_swimlane lanes into the page-level q_resources list; blocks
// and lanes keep pointers. Mirrors DrawioVersionUpgrader /
// VisioVersionUpgrader.migrateResourcesToModelLevel (Part 1).
//
// Runs UNCONDITIONALLY on every open (ModelManager.ensureModelDefinition),
// before the schema-version upgrade -- that upgrade only runs when versions
// differ, so an already-current document holding shape-owned resources
// would otherwise never migrate. Idempotent: a pointer block or a lane with
// resourceId is skipped, and a second pass writes nothing.
//
// Own backup/restore envelope (LucidVersionUpgrader's envelope is not
// available outside its upgrade, and it does not back up q_swimlane).
import { PageProxy } from 'lucid-extension-sdk';
import {
    SimulationObjectType,
    StoredResourceRecord,
    SwimLaneQuodsiData,
    generateUniqueName,
    getLogger,
} from '@quodsi/lucid-shared';
import { StorageAdapter } from './StorageAdapter';
import { LUCID_STORAGE_FORMAT } from './storageFormat';

const log = getLogger('ResourceStorageMigration');
const SWIMLANE_DATA_KEY = 'q_swimlane';
const DATA_KEY = 'q_data';

export interface ResourceRename { resourceId: string; from: string; to: string }
export interface ResourceMigrationResult {
    /** True when at least one block or lane record was lifted. */
    migrated: boolean;
    /** Name collisions resolved during this run (empty on a repeat run). */
    renames: ResourceRename[];
}

type LegacyLane = {
    laneId: string; titleSnapshot: string; assignmentMode: 'runtime-derive' | 'explicit';
    resourceId?: string;
    resource?: { id: string; name: string; capacity?: number; description?: string; financialProperties?: StoredResourceRecord['financialProperties'] };
};

export function migrateResourcesToModelLevel(page: PageProxy, sa: StorageAdapter): ResourceMigrationResult {
    const byId = new Map<string, StoredResourceRecord>();
    for (const r of sa.getResources(page)) byId.set(String(r.id), r);
    const existingCount = byId.size;

    // Backup of every key this function may write, restored on throw.
    const backup = {
        page: {
            resources: page.shapeData.get('q_resources') as string | undefined,
            format: page.shapeData.get('q_lucid_format') as string | undefined,
        },
        blocks: new Map<string, { data?: string; swim?: string; block: any }>(),
    };
    const remember = (block: any) => {
        if (!backup.blocks.has(block.id)) {
            backup.blocks.set(block.id, { block, data: block.shapeData.get(DATA_KEY), swim: block.shapeData.get(SWIMLANE_DATA_KEY) });
        }
    };
    const restore = () => {
        const put = (el: any, key: string, v: string | undefined) => (v === undefined ? el.shapeData.delete(key) : el.shapeData.set(key, v));
        put(page, 'q_resources', backup.page.resources);
        put(page, 'q_lucid_format', backup.page.format);
        for (const { block, data, swim } of backup.blocks.values()) { put(block, DATA_KEY, data); put(block, SWIMLANE_DATA_KEY, swim); }
    };

    let lifted = false;
    try {
        for (const [, block] of page.allBlocks) {
            // 1. Resource block holding a full record -> lift + pointer.
            const typeInfo = sa.getElementType(block);
            if (typeInfo?.type === SimulationObjectType.Resource) {
                const data = (sa.getElementData(block) ?? {}) as Record<string, unknown>;
                // `resourceId` alone decides it: a format-1 record NEVER carries one,
                // so this lifts exactly the same legacy set. Do NOT also require
                // `name === undefined` -- StorageAdapter.updateElementData MERGES, so a
                // panel edit on an already-migrated pointer block leaves `name`/`capacity`
                // sitting next to `resourceId`, and the stricter test would re-classify
                // that block as legacy: it would mint a fresh record under block.id and
                // repoint the block, discarding the edit (resourceId === block.id) or
                // forking a duplicate and orphaning the real link (resourceId !== block.id).
                const isPointer = data.resourceId !== undefined;
                if (!isPointer) {
                    remember(block);
                    const record: StoredResourceRecord = {
                        id: block.id,
                        name: typeof data.name === 'string' && data.name ? data.name : 'New Resource',
                        capacity: typeof data.capacity === 'number' ? data.capacity : 1,
                        description: typeof data.description === 'string' ? data.description : '',
                    };
                    if (data.financialProperties) record.financialProperties = data.financialProperties as StoredResourceRecord['financialProperties'];
                    if (Array.isArray(data.levers) && data.levers.length) record.levers = data.levers as StoredResourceRecord['levers'];
                    if (!byId.has(block.id)) byId.set(block.id, record);   // first claimant wins
                    sa.setElementData(block, { id: block.id, resourceId: block.id }, SimulationObjectType.Resource, { mappingSource: typeInfo.mappingSource });
                    lifted = true;
                }
            }
            // 2. Swimlane lanes holding inline records -> lift + resourceId.
            // Guarded on the SAME predicate the builder claims lanes with
            // (ModelDefinitionPageBuilder.linkResourceClaimants). If migration
            // stripped inline records from a block the builder never reads lanes
            // from, those resources would move into q_resources and then have no
            // claimant at all -- the two passes must agree on what a swimlane is.
            const swimStr = block.getClassName() === 'AdvancedSwimLaneBlock'
                ? (block.shapeData.get(SWIMLANE_DATA_KEY) as string | undefined)
                : undefined;
            if (swimStr) {
                let swim: SwimLaneQuodsiData | null = null;
                try { swim = JSON.parse(swimStr); } catch { swim = null; }
                if (swim && Array.isArray(swim.lanes)) {
                    let laneChanged = false;
                    const lanes = (swim.lanes as unknown as (LegacyLane | null)[]).map((lane) => {
                        if (!lane || !lane.resource || lane.resourceId !== undefined) return lane;
                        const r = lane.resource;
                        const record: StoredResourceRecord = { id: r.id, name: r.name, capacity: r.capacity ?? 1, description: r.description ?? '' };
                        if (r.financialProperties) record.financialProperties = r.financialProperties;
                        if (!byId.has(r.id)) byId.set(r.id, record);
                        laneChanged = true;
                        const { resource: _legacy, ...rest } = lane;
                        return { ...rest, resourceId: r.id };
                    });
                    if (laneChanged) {
                        remember(block);
                        block.shapeData.set(SWIMLANE_DATA_KEY, JSON.stringify({ ...swim, lanes }));
                        lifted = true;
                    }
                }
            }
        }

        // 3. Name collisions became possible once two storage locations merged.
        const renames: ResourceRename[] = [];
        const taken = new Set<string>();
        const records = [...byId.values()].map((r) => {
            const unique = generateUniqueName(r.name, (n) => taken.has(n));
            taken.add(unique);
            if (unique !== r.name) { renames.push({ resourceId: r.id, from: r.name, to: unique }); return { ...r, name: unique }; }
            return r;
        });

        if (lifted || renames.length || (existingCount !== records.length)) {
            sa.setResources(page, records);
        }
        if (sa.getStorageFormat(page) !== LUCID_STORAGE_FORMAT) {
            sa.setStorageFormat(page, LUCID_STORAGE_FORMAT);
        }
        if (lifted) log.info('Migrated shape-owned resources to q_resources', { count: records.length, renames: renames.length });
        return { migrated: lifted, renames };
    } catch (error) {
        restore();
        throw error;
    }
}
