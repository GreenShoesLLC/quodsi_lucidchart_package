// src/core/PasteNormalizer.ts
//
// Task 1: skeleton — paste detection, per-page batching, generic envelope
// re-stamp, and the never-lose-the-paste failure posture. A pasted item is
// detected by the asymmetry Lucid's copy/paste leaves behind: shapeData
// (including q_data) is copied byte-for-byte onto the new shape, so the
// envelope's stored id still names the ORIGINAL item while `item.id` is the
// new one. Typed per-element rules (Resource / swimlane-carrier / Activity /
// Generator / Connector) land in Tasks 3-7; this file only re-stamps the
// envelope id generically via the `default:` branch below.
//
// Task 3 adds the Resource case (see normalizeResource).
// Task 4 adds the swimlane-carrier case (see normalizeSwimlane). A swimlane
// block carries `q_swimlane`, not `q_data`, so it never satisfies
// `isPastedItem` and never enters the per-item loop below; it is detected and
// normalized in its own pass instead, run first (see the ordering note in
// the per-page loop).
// Task 5 adds the Activity case (see normalizeActivity): fresh action ids
// (recursively, via remintActionIds), fresh lever ids with actionId repointed
// through the resulting id map, and a unique stored name.

import { ItemProxy, PageProxy } from 'lucid-extension-sdk';
import {
    Action,
    ScenarioLever,
    SimulationObjectType,
    StoredResourceRecord,
    SwimLaneLaneMapping,
    SwimLaneQuodsiData,
    generateUUID,
    generateUniqueName,
    getLogger,
} from '@quodsi/lucid-shared';
import { StorageAdapter } from './StorageAdapter';

const log = getLogger('PasteNormalizer');

const SWIMLANE_DATA_KEY = 'q_swimlane';

export interface PasteNormalizationResult {
    /** True when anything was written. */
    changed: boolean;
    /** Human sentences for the consumed-once notice channel, one per normalization performed. */
    notices: string[];
}

export interface PasteNormalizerOptions {
    /**
     * Enumerates every page of the document, for the cross-page pointer lookup
     * (Resource rule 3). `PageProxy` carries no back-reference to its document
     * (see the SDK's pageproxy.d.ts) and the normalizer holds no EditorClient,
     * so the enumeration is injected: production passes
     * `() => [...new DocumentProxy(client).pages.values()]` from
     * pasteHookWiring. Omitted → same-page-only lookup, i.e. an id that does
     * not resolve on the target page is treated as resolving nowhere.
     */
    allPages?: () => PageProxy[];
}

/** Exposed for tests: true when the stored envelope id differs from the item's own id. */
export function isPastedItem(item: ItemProxy, sa: StorageAdapter): boolean {
    const typeInfo = sa.getElementType(item);
    if (!typeInfo?.type) return false;
    const data = sa.getElementData(item) as { id?: string } | null;
    return !!data && data.id !== undefined && String(data.id) !== item.id;
}

export function normalizePastedItems(
    items: ItemProxy[],
    sa: StorageAdapter,
    opts: PasteNormalizerOptions = {}
): PasteNormalizationResult {
    const result: PasteNormalizationResult = { changed: false, notices: [] };
    const byPage = new Map<PageProxy, ItemProxy[]>();
    for (const item of items) {
        const page = item.getPage?.();
        if (!page) continue;                       // groups / detached items: skip (R4)
        if (!byPage.has(page)) byPage.set(page, []);
        byPage.get(page)!.push(item);
    }
    for (const [page, pageItems] of byPage) {
        // Ordering ruling (Task 3 review): pasted swimlanes are normalized
        // BEFORE the generic per-item loop -- and therefore before the
        // Resource rule -- in the same page's batch. The swimlane rule always
        // drops a claimed lane's `resourceId`; running it first means a
        // Resource block pasted in the SAME gesture sees that drop as already
        // settled reality when `hasOtherClaimant` walks the page, instead of
        // a stale "still claimed" view a pass ordered the other way would
        // leave it with.
        const swimlaneCarriers = pageItems.filter(isSwimlaneCarrierItem);
        for (const item of swimlaneCarriers) {
            try {
                normalizeSwimlane(item, page, result, opts);
            } catch (error) {
                log.error('Swimlane paste normalization failed for item; left as pasted', { itemId: item.id, error });
            }
        }

        // Task 8 inserts page-duplicate detection here, before per-item rules.
        for (const item of pageItems) {
            try {
                if (!isPastedItem(item, sa)) continue;
                normalizeOne(item, page, sa, result, opts);
            } catch (error) {
                log.error('Paste normalization failed for item; left as pasted', { itemId: item.id, error });
            }
        }
    }
    return result;
}

function normalizeOne(
    item: ItemProxy,
    page: PageProxy,
    sa: StorageAdapter,
    result: PasteNormalizationResult,
    opts: PasteNormalizerOptions
): void {
    const typeInfo = sa.getElementType(item)!;
    switch (typeInfo.type) {
        // Tasks 6-7 add Generator / Connector cases.
        case SimulationObjectType.Resource:
            normalizeResource(item, page, sa, result, opts);
            break;
        case SimulationObjectType.Activity:
            normalizeActivity(item, page, sa, result);
            break;
        default:
            restampEnvelope(item, sa);
            result.changed = true;
    }
}

/**
 * Resource rule. A pasted Resource block's `q_data` domain is a pointer,
 * `{ resourceId }`, still naming whatever the ORIGINAL block pointed at.
 * Where that id resolves decides the outcome:
 *
 *   1. on THIS page, and another item here still claims it → clone the record
 *      into this page's `q_resources` and point the paste at the clone;
 *   2. on THIS page with no other claimant (the original was deleted before
 *      the paste) → keep the pointer, re-stamp the envelope only;
 *   3. only on ANOTHER page of the document → clone that record INTO this
 *      page's list (name deduped here) and point at it;
 *   4. nowhere → drop the pointer; the block arrives unlinked and the panel's
 *      picker takes over.
 *
 * Each branch ends with its own `setElementData` write — this case never also
 * calls `restampEnvelope`, which would be a redundant second write of the same
 * key. Once written, the stored id equals `item.id`, so `isPastedItem` is
 * false and a second pass is a no-op.
 *
 * Batch note: Resource items are processed one at a time against LIVE storage,
 * with no bookkeeping of which pastes earlier in this batch were already
 * re-pointed. That is deliberate. Two pasted copies of the same original both
 * see the ORIGINAL block still claiming the record, so both clone — one clone
 * per pasted copy, which is the intended semantics ("paste means: duplicate
 * the thing with a fresh identity").
 */
function normalizeResource(
    item: ItemProxy,
    page: PageProxy,
    sa: StorageAdapter,
    result: PasteNormalizationResult,
    opts: PasteNormalizerOptions
): void {
    const typeInfo = sa.getElementType(item)!;
    const data = (sa.getElementData(item) ?? {}) as Record<string, unknown>;
    const { id: _old, type: _t, ...domain } = data;
    const stamp = (nextDomain: Record<string, unknown>): void => {
        sa.setElementData(item, { id: item.id, ...nextDomain } as { id: string }, SimulationObjectType.Resource, {
            mappingSource: typeInfo.mappingSource,
        });
        result.changed = true;
    };

    const resourceId = typeof domain.resourceId === 'string' && domain.resourceId ? domain.resourceId : undefined;
    if (!resourceId) {
        // Already unlinked: nothing to resolve, just re-stamp the envelope.
        stamp(domain);
        return;
    }

    const pageRecords = sa.getResources(page);
    const onThisPage = pageRecords.find((r) => String(r.id) === resourceId);

    if (onThisPage) {
        if (!hasOtherClaimant(page, item, resourceId, sa)) {
            stamp(domain);                                   // rule 2: keep the pointer
            return;
        }
        cloneInto(page, sa, pageRecords, onThisPage, stamp, domain, result);   // rule 1
        return;
    }

    const elsewhere = findOnOtherPages(page, resourceId, sa, opts);
    if (elsewhere) {
        cloneInto(page, sa, pageRecords, elsewhere, stamp, domain, result);    // rule 3
        return;
    }

    // Rule 4: resolves nowhere.
    stamp({});
    result.notices.push('Pasted resource shape is not linked (its resource was not found)');
}

/** Appends a clone of `source` to this page's records and points the paste at it. */
function cloneInto(
    page: PageProxy,
    sa: StorageAdapter,
    pageRecords: StoredResourceRecord[],
    source: StoredResourceRecord,
    stamp: (nextDomain: Record<string, unknown>) => void,
    domain: Record<string, unknown>,
    result: PasteNormalizationResult
): void {
    const clone = cloneResourceRecord(source, pageRecords);
    sa.setResources(page, [...pageRecords, clone]);
    stamp({ ...domain, resourceId: clone.id });
    result.notices.push(`Pasted resource linked to new copy '${clone.name}'`);
}

/**
 * A copy of `source` with a fresh id, a name unique among `takenIn`, and
 * levers carried over under fresh `leverId`s (every other lever field intact —
 * a lever is authoring metadata about the same property, so it survives the
 * copy; only its identity is new).
 */
function cloneResourceRecord(source: StoredResourceRecord, takenIn: StoredResourceRecord[]): StoredResourceRecord {
    const takenNames = new Set(takenIn.map((r) => r.name));
    const clone: StoredResourceRecord = {
        id: generateUUID(),
        name: generateUniqueName(source.name, (n) => takenNames.has(n)),
        capacity: source.capacity,
        description: source.description,
    };
    if (source.financialProperties) clone.financialProperties = { ...source.financialProperties };
    if (source.levers) clone.levers = source.levers.map((lever) => ({ ...lever, leverId: generateUUID() }));
    return clone;
}

/**
 * Activity rule (Task 5). A pasted Activity block's `q_data` domain carries
 * the ORIGINAL block's actions, levers, and stored name verbatim -- same
 * action ids (`actions[].id`, including nested branch actions), same lever
 * ids (`levers[].leverId`), same `name`. All three need fresh identity so
 * the pasted copy stops sharing authoring metadata with the original:
 *
 *   - every action gets a fresh `id`, recursively through BranchAction's
 *     `ifTrue`/`ifFalse` and LoopAction's `actions` (see `remintActionIds`).
 *   - every lever gets a fresh `leverId`; a lever whose `actionId` pointed at
 *     one of the re-minted actions is repointed to that action's NEW id via
 *     the id map `remintActionIds` builds -- a lever whose `actionId` does
 *     not resolve (dangling) is left unchanged.
 *   - the stored `name`, when present, is deduped against every OTHER
 *     Activity's stored name on this page; only on an actual collision does
 *     the name change, and only then does the notice fire.
 *
 * `resourceRequirementId` (on Seize/DelayWithResource actions) and
 * `failureProperties.repairResourceRequirementId` are left byte-identical --
 * they name a Resource requirement, an identity space this rule does not
 * touch.
 *
 * Single write, same pattern as `normalizeResource`: this case never also
 * calls `restampEnvelope`. Once written the stored id equals `item.id`, so a
 * second pass sees `isPastedItem` false and is a no-op.
 */
function normalizeActivity(item: ItemProxy, page: PageProxy, sa: StorageAdapter, result: PasteNormalizationResult): void {
    const typeInfo = sa.getElementType(item)!;
    const data = (sa.getElementData(item) ?? {}) as Record<string, unknown>;
    const { id: _old, type: _t, ...domain } = data;

    if (Array.isArray(domain.actions)) {
        const { actions: remintedActions, idMap } = remintActionIds(domain.actions as Action[]);
        domain.actions = remintedActions;

        if (Array.isArray(domain.levers)) {
            domain.levers = (domain.levers as ScenarioLever[]).map((lever) => {
                const next: ScenarioLever = { ...lever, leverId: generateUUID() };
                if (lever.actionId !== undefined && idMap.has(lever.actionId)) {
                    next.actionId = idMap.get(lever.actionId)!;
                }
                return next;
            });
        }
    } else if (Array.isArray(domain.levers)) {
        // No actions to re-mint (so no id map), but levers still need fresh
        // identity; any actionId they carry is necessarily dangling here.
        domain.levers = (domain.levers as ScenarioLever[]).map((lever) => ({ ...lever, leverId: generateUUID() }));
    }

    if (typeof domain.name === 'string' && domain.name) {
        const takenNames = collectTakenActivityNames(page, sa, item.id);
        const uniqueName = generateUniqueName(domain.name, (candidate) => takenNames.has(candidate));
        if (uniqueName !== domain.name) {
            domain.name = uniqueName;
            result.notices.push(`Pasted activity renamed to '${uniqueName}'`);
        }
    }

    sa.setElementData(item, { id: item.id, ...domain } as { id: string }, SimulationObjectType.Activity, {
        mappingSource: typeInfo.mappingSource,
    });
    result.changed = true;
}

/**
 * Mints a fresh `id` for every action in `actions`, recursing into
 * BranchAction's `ifTrue`/`ifFalse` and LoopAction's `actions` -- the only
 * nested-action branches the shared Action union has (confirmed by grepping
 * `quodsi_shared/src/types/elements/actions` for `ifTrue`/`ifFalse`/`actions:`
 * -- see the Task 5 report). Returns the rebuilt array alongside an
 * `idMap` from every OLD action id to its NEW one (top-level and nested
 * alike), which the lever-repoint step uses to follow a lever's `actionId`
 * to the same logical action under its new identity.
 */
function remintActionIds(actions: Action[]): { actions: Action[]; idMap: Map<string, string> } {
    const idMap = new Map<string, string>();

    const remint = (list: Action[]): Action[] =>
        list.map((action) => {
            const newId = generateUUID();
            if (action.id) idMap.set(action.id, newId);
            const next: Record<string, unknown> = { ...(action as unknown as Record<string, unknown>), id: newId };
            if (Array.isArray((action as unknown as { ifTrue?: unknown }).ifTrue)) {
                next.ifTrue = remint((action as unknown as { ifTrue: Action[] }).ifTrue);
            }
            if (Array.isArray((action as unknown as { ifFalse?: unknown }).ifFalse)) {
                next.ifFalse = remint((action as unknown as { ifFalse: Action[] }).ifFalse);
            }
            if (Array.isArray((action as unknown as { actions?: unknown }).actions)) {
                next.actions = remint((action as unknown as { actions: Action[] }).actions);
            }
            return next as unknown as Action;
        });

    return { actions: remint(actions), idMap };
}

/** Every OTHER Activity block's stored `name` on `page`, for unique-name dedup. */
function collectTakenActivityNames(page: PageProxy, sa: StorageAdapter, excludeItemId: string): Set<string> {
    const taken = new Set<string>();
    for (const [, block] of page.allBlocks) {
        if (block.id === excludeItemId) continue;
        const typeInfo = sa.getElementType(block);
        if (typeInfo?.type !== SimulationObjectType.Activity) continue;
        const blockData = sa.getElementData<{ name?: string }>(block);
        if (blockData?.name) taken.add(blockData.name);
    }
    return taken;
}

/**
 * True when something OTHER than `item` on this page still points at
 * `resourceId`: another Resource block's `q_data` pointer, or a swimlane lane
 * (`q_swimlane.lanes[n].resourceId`). Those are exactly the two claim sites
 * `ModelDefinitionPageBuilder.linkResourceClaimants` collects -- including its
 * `AdvancedSwimLaneBlock` class gate on the lane side (see `laneClaims`) -- so
 * this test agrees with the model builder's notion of "claimed".
 */
function hasOtherClaimant(page: PageProxy, item: ItemProxy, resourceId: string, sa: StorageAdapter): boolean {
    for (const [, block] of page.allBlocks) {
        if (block.id === item.id) continue;

        const typeInfo = sa.getElementType(block);
        if (typeInfo?.type === SimulationObjectType.Resource) {
            const data = (sa.getElementData(block) ?? {}) as { resourceId?: unknown };
            if (typeof data.resourceId === 'string' && data.resourceId === resourceId) return true;
        }

        if (laneClaims(block, resourceId)) return true;
    }
    return false;
}

/**
 * True when any lane on `block`'s q_swimlane is linked to `resourceId`.
 *
 * Gated on the SAME class predicate the builder claims lanes with
 * (`ModelDefinitionPageBuilder.linkResourceClaimants`) and the migration lifts
 * lanes with (`ResourceStorageMigration`): a `q_swimlane` blob on a block that
 * is not an `AdvancedSwimLaneBlock` is never read as a claim by either pass,
 * so it must not count as one here -- a stray blob would otherwise force a
 * clone that nothing on the page actually needs.
 */
function laneClaims(
    block: { getClassName(): string; shapeData: { get(key: string): unknown } },
    resourceId: string
): boolean {
    if (block.getClassName() !== 'AdvancedSwimLaneBlock') return false;
    const raw = block.shapeData.get(SWIMLANE_DATA_KEY);
    if (typeof raw !== 'string' || !raw) return false;
    let swim: SwimLaneQuodsiData | null = null;
    try {
        swim = JSON.parse(raw) as SwimLaneQuodsiData;
    } catch {
        return false;
    }
    if (!swim || !Array.isArray(swim.lanes)) return false;
    return swim.lanes.some((lane) => !!lane && lane.resourceId === resourceId);
}

/** The record `resourceId` names on some OTHER page of the document, if any. */
function findOnOtherPages(
    page: PageProxy,
    resourceId: string,
    sa: StorageAdapter,
    opts: PasteNormalizerOptions
): StoredResourceRecord | undefined {
    if (!opts.allPages) return undefined;
    for (const other of opts.allPages()) {
        if (!other || other === page || other.id === page.id) continue;
        const found = sa.getResources(other).find((r) => String(r.id) === resourceId);
        if (found) return found;
    }
    return undefined;
}

/** Re-write q_data so the stored id is the item's own id; type + mappingSource preserved. */
function restampEnvelope(item: ItemProxy, sa: StorageAdapter): void {
    const typeInfo = sa.getElementType(item)!;
    const data = sa.getElementData(item) as Record<string, unknown>;
    const { id: _old, type: _t, ...domain } = data;
    sa.setElementData(item, { id: item.id, ...domain } as { id: string }, typeInfo.type, { mappingSource: typeInfo.mappingSource });
}

/** A block whose SDK class marks it as a swimlane carrier -- the same gate `hasOtherClaimant`/`laneClaims` use. */
type SwimlaneCarrier = ItemProxy & { getClassName(): string };

/** True for an item that is (a) a block (has `getClassName`) and (b) an `AdvancedSwimLaneBlock`. `ItemProxy` itself has no `getClassName` -- only its `BlockProxy` subclass does -- so a line among the batch is safely excluded. */
function isSwimlaneCarrierItem(item: ItemProxy): item is SwimlaneCarrier {
    const maybeBlock = item as { getClassName?: unknown };
    return typeof maybeBlock.getClassName === 'function' && (maybeBlock.getClassName as () => string)() === 'AdvancedSwimLaneBlock';
}

/**
 * Swimlane rule (Task 4). A pasted swimlane block's `q_swimlane` is a
 * byte-for-byte copy of the source's -- same lane `laneId`s, same
 * `resourceId`s. Unlike the Resource rule there is no `q_data` envelope id to
 * compare against; detection instead rests on the one thing a copy cannot
 * avoid duplicating: `laneId`. Lane mappings mint a fresh UUID for `laneId`
 * at authoring time (see `SwimLaneLaneMapping`), so two lanes sharing one
 * cannot arise independently -- a collision IS the paste signal. A swimlane
 * counts as "pasted" when at least one of its lanes' `laneId`s also appears
 * on another `AdvancedSwimLaneBlock` in the document (same page, or any page
 * `opts.allPages` enumerates when supplied -- same lazy, injected pattern as
 * the Resource rule's cross-page pointer lookup). A swimlane whose laneIds
 * are all globally unique is not a paste and is left untouched.
 *
 * Limitation: a collision that only exists on a page `opts.allPages` does not
 * cover is invisible, exactly like the Resource rule's rule-3 lookup -- an
 * unlisted page's copy is treated as if it does not exist.
 *
 * For a swimlane this predicate says IS pasted, each non-null lane is
 * rebuilt keeping only `titleSnapshot` and `assignmentMode` and minting a
 * fresh `laneId`; rebuilding from just those two fields is what drops
 * `resourceId` and any legacy inline `resource` record in the same step. The
 * write shape (`{ lanes, lastSyncedAt }`) matches `SwimLaneHandler.handleUpdate`.
 * One notice per swimlane block. Fresh laneIds cannot collide with anything
 * already in the document, so a second pass finds no collision and writes
 * nothing -- idempotent.
 */
function normalizeSwimlane(
    item: SwimlaneCarrier,
    page: PageProxy,
    result: PasteNormalizationResult,
    opts: PasteNormalizerOptions
): void {
    const raw = item.shapeData.get(SWIMLANE_DATA_KEY);
    if (typeof raw !== 'string' || !raw) return;
    let swim: SwimLaneQuodsiData | null = null;
    try {
        swim = JSON.parse(raw) as SwimLaneQuodsiData;
    } catch {
        return;
    }
    if (!swim || !Array.isArray(swim.lanes)) return;

    if (!isPastedSwimlaneBlock(item, page, swim, opts)) return;

    const nextLanes: (SwimLaneLaneMapping | null)[] = swim.lanes.map((lane) => {
        if (!lane) return null;
        return {
            laneId: generateUUID(),
            titleSnapshot: lane.titleSnapshot,
            assignmentMode: lane.assignmentMode,
        };
    });
    const next: SwimLaneQuodsiData = { lanes: nextLanes, lastSyncedAt: new Date().toISOString() };
    item.shapeData.set(SWIMLANE_DATA_KEY, JSON.stringify(next));
    result.changed = true;
    result.notices.push('Pasted swimlane lanes are not linked to resources');
}

/** True when some OTHER `AdvancedSwimLaneBlock` in the document has a lane whose `laneId` matches one of `swim`'s. */
function isPastedSwimlaneBlock(
    item: SwimlaneCarrier,
    page: PageProxy,
    swim: SwimLaneQuodsiData,
    opts: PasteNormalizerOptions
): boolean {
    const laneIds = new Set(swim.lanes.filter((lane): lane is SwimLaneLaneMapping => !!lane).map((lane) => lane.laneId));
    if (laneIds.size === 0) return false;

    const collidesOn = (candidatePage: PageProxy): boolean => {
        for (const [, block] of candidatePage.allBlocks) {
            if (block.id === item.id) continue;
            if (block.getClassName() !== 'AdvancedSwimLaneBlock') continue;
            const otherRaw = block.shapeData.get(SWIMLANE_DATA_KEY);
            if (typeof otherRaw !== 'string' || !otherRaw) continue;
            let other: SwimLaneQuodsiData | null = null;
            try {
                other = JSON.parse(otherRaw) as SwimLaneQuodsiData;
            } catch {
                continue;
            }
            if (!other || !Array.isArray(other.lanes)) continue;
            if (other.lanes.some((lane) => !!lane && laneIds.has(lane.laneId))) return true;
        }
        return false;
    };

    if (collidesOn(page)) return true;
    if (!opts.allPages) return false;
    for (const other of opts.allPages()) {
        if (!other || other === page || other.id === page.id) continue;
        if (collidesOn(other)) return true;
    }
    return false;
}
