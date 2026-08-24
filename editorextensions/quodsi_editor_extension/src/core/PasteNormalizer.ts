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
// Task 6 adds the Generator case (see normalizeGenerator): fresh lever ids
// (no actions on a Generator, so no id map to repoint through), a unique
// stored name, `entityId` left byte-identical, and its linked
// ArrivalPattern/ArrivalSchedule records CLONED (never shared) -- see the
// doc comment on normalizeGenerator for why this differs from the Resource
// rule's "no other claimant -> keep the pointer" branch.
// Task 7 adds the Connector case (see normalizeConnector): stored
// sourceId/targetId overlaid with the live line's attached endpoints (via
// the shared `liveEndpointIds` helper, also used by ConnectorLucid), and the
// stored name regenerated from those endpoints' stored names ONLY when both
// resolve to a named block.
// Task 8 adds PAGE-DUPLICATE mode (see normalizeDuplicatedPage), which
// branches above EVERY per-item rule -- swimlane pass included -- when the
// page's own q_data envelope names a different page. A duplicated page is
// self-consistent, so it is re-stamped and repaired rather than cloned.

import { ItemProxy, LineProxy, PageProxy } from 'lucid-extension-sdk';
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
    pickConnectorName,
} from '@quodsi/lucid-shared';
import { StorageAdapter } from './StorageAdapter';
import { liveEndpointIds } from '../types/ConnectorLucid';
import { lineToNameable } from '../types/nameableShape';

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
        // Task 8: a DUPLICATED PAGE is repaired wholesale and takes none of
        // the per-item rules -- not even the swimlane pass, which is why this
        // branch sits above it. See normalizeDuplicatedPage.
        //
        // There is deliberately NO fallback (review 1.1). Once detection has
        // fired, the per-item rules are KNOWN-WRONG for this page: they would
        // clone records the page already owns outright, re-mint ids that are
        // already unique within it, and let the swimlane pass rewrite lanes
        // whose laneIds legitimately collide with the source page's. A
        // half-repaired duplicate is strictly better than a mangled one, so a
        // throw is logged and the page is skipped either way.
        const duplicated = duplicatedPageEnvelope(page, opts);
        if (duplicated) {
            try {
                normalizeDuplicatedPage(page, pageItems, duplicated, sa, result);
            } catch (error) {
                log.error('Duplicated-page normalization failed; page left partially repaired', { pageId: page.id, error });
            }
            continue;
        }

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
        case SimulationObjectType.Resource:
            normalizeResource(item, page, sa, result, opts);
            break;
        case SimulationObjectType.Activity:
            normalizeActivity(item, page, sa, result);
            break;
        case SimulationObjectType.Generator:
            normalizeGenerator(item, page, sa, result, opts);
            break;
        case SimulationObjectType.Connector:
            normalizeConnector(item, page, sa, result);
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
        const takenNames = collectTakenNames(page, sa, SimulationObjectType.Activity, item.id);
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

/** Every OTHER block's stored `name` on `page`, of the given `type`, for unique-name dedup. */
function collectTakenNames(page: PageProxy, sa: StorageAdapter, type: SimulationObjectType, excludeItemId: string): Set<string> {
    const taken = new Set<string>();
    for (const [, block] of page.allBlocks) {
        if (block.id === excludeItemId) continue;
        const typeInfo = sa.getElementType(block);
        if (typeInfo?.type !== type) continue;
        const blockData = sa.getElementData<{ name?: string }>(block);
        if (blockData?.name) taken.add(blockData.name);
    }
    return taken;
}

/**
 * Generator rule (Task 6). A pasted Generator block's `q_data` domain
 * carries the ORIGINAL block's `entityId`, `arrivalPatternId`/
 * `arrivalScheduleId`, `levers`, and stored `name` verbatim. Four things
 * need attention:
 *
 *   - `entityId` is left byte-identical -- it names an Entity, an identity
 *     space this rule does not touch.
 *   - every lever gets a fresh `leverId`. Unlike Activity, a Generator has
 *     no `actions`, so there is no id map to repoint an `actionId` through
 *     -- levers are simply re-minted in place.
 *   - the stored `name`, when present, is deduped against every OTHER
 *     Generator's stored name on this page; only on an actual collision
 *     does the name change, and only then does the rename notice fire.
 *   - `arrivalPatternId` / `arrivalScheduleId`, when present, are each
 *     resolved against the linked list (`getArrivalPatterns`/
 *     `getArrivalSchedules`) -- THIS page first, then (via `opts.allPages`)
 *     every other page of the document. A resolved record is ALWAYS cloned
 *     (fresh id, name deduped against THIS page's list) and appended to
 *     THIS page's list, and the paste is repointed at the clone -- even
 *     when the source lives on this same page. That is deliberately
 *     different from the Resource rule's "resolves here with no other
 *     claimant -> keep the pointer" branch: a pattern/schedule is 1:1-owned
 *     by its generator (see the StorageAdapter doc comments -- "one
 *     pattern/schedule per generator is enforced by the UI"), so a paste
 *     must never leave two generators pointing at the same record. An id
 *     that resolves nowhere is dropped from the domain entirely -- absence
 *     is itself the meaningful "no pattern linked" value here (see
 *     GeneratorLucid.ts's GENERATOR_CLEARABLE_KEYS note).
 *
 * Single write, same pattern as `normalizeActivity`/`normalizeResource`:
 * this case never also calls `restampEnvelope`. Once written the stored id
 * equals `item.id`, so a second pass sees `isPastedItem` false and is a
 * no-op; a fresh pattern/schedule clone's id can never collide with
 * anything already in either list, so a second pass also finds nothing left
 * to clone.
 */
function normalizeGenerator(
    item: ItemProxy,
    page: PageProxy,
    sa: StorageAdapter,
    result: PasteNormalizationResult,
    opts: PasteNormalizerOptions
): void {
    const typeInfo = sa.getElementType(item)!;
    const data = (sa.getElementData(item) ?? {}) as Record<string, unknown>;
    const { id: _old, type: _t, ...domain } = data;

    if (Array.isArray(domain.levers)) {
        domain.levers = (domain.levers as ScenarioLever[]).map((lever) => ({ ...lever, leverId: generateUUID() }));
    }

    let finalName: string | undefined = typeof domain.name === 'string' && domain.name ? domain.name : undefined;
    if (finalName) {
        const takenNames = collectTakenNames(page, sa, SimulationObjectType.Generator, item.id);
        const uniqueName = generateUniqueName(finalName, (candidate) => takenNames.has(candidate));
        if (uniqueName !== finalName) {
            finalName = uniqueName;
            domain.name = uniqueName;
            result.notices.push(`Pasted generator renamed to '${uniqueName}'`);
        }
    }

    if (typeof domain.arrivalPatternId === 'string' && domain.arrivalPatternId) {
        const clone = cloneLinkedRecord(
            page,
            domain.arrivalPatternId,
            (p) => sa.getArrivalPatterns(p),
            (p, list) => sa.setArrivalPatterns(p, list),
            opts,
            finalName,
            'Arrival Pattern'
        );
        if (clone) {
            domain.arrivalPatternId = clone.id;
            result.notices.push('Pasted generator uses a new copy of its arrival pattern');
        } else {
            delete domain.arrivalPatternId;
        }
    }

    if (typeof domain.arrivalScheduleId === 'string' && domain.arrivalScheduleId) {
        const clone = cloneLinkedRecord(
            page,
            domain.arrivalScheduleId,
            (p) => sa.getArrivalSchedules(p),
            (p, list) => sa.setArrivalSchedules(p, list),
            opts,
            finalName,
            'Arrival Schedule'
        );
        if (clone) {
            domain.arrivalScheduleId = clone.id;
            result.notices.push('Pasted generator uses a new copy of its arrival schedule');
        } else {
            delete domain.arrivalScheduleId;
        }
    }

    sa.setElementData(item, { id: item.id, ...domain } as { id: string }, SimulationObjectType.Generator, {
        mappingSource: typeInfo.mappingSource,
    });
    result.changed = true;
}

/**
 * Resolves `linkedId` against `getList(page)` (THIS page first, then every
 * other page `opts.allPages` enumerates), and when found, clones it onto
 * THIS page's list: fresh `id`, name deduped against `getList(page)` (via
 * `generateUniqueName`, falling back to `generatorName` then `defaultName`
 * when the source record itself has no usable name). Returns the clone, or
 * `undefined` when `linkedId` resolves nowhere -- callers drop the pointer
 * in that case, they never keep a dangling id.
 */
function cloneLinkedRecord<T extends { id: string; name?: string }>(
    page: PageProxy,
    linkedId: string,
    getList: (p: PageProxy) => T[],
    setList: (p: PageProxy, list: T[]) => void,
    opts: PasteNormalizerOptions,
    generatorName: string | undefined,
    defaultName: string
): T | undefined {
    const pageRecords = getList(page);
    const source = pageRecords.find((r) => String(r.id) === linkedId) ?? findLinkedOnOtherPages(page, linkedId, getList, opts);
    if (!source) return undefined;

    const takenNames = new Set(pageRecords.map((r) => r.name).filter((n): n is string => !!n));
    const clone: T = {
        ...source,
        id: generateUUID(),
        name: generateUniqueName(source.name ?? generatorName ?? defaultName, (candidate) => takenNames.has(candidate)),
    };
    setList(page, [...pageRecords, clone]);
    return clone;
}

/** The record `linkedId` names on some OTHER page of the document, if any -- same lazy `opts.allPages` pattern as `findOnOtherPages` (Resource rule). */
function findLinkedOnOtherPages<T extends { id: string }>(
    page: PageProxy,
    linkedId: string,
    getList: (p: PageProxy) => T[],
    opts: PasteNormalizerOptions
): T | undefined {
    if (!opts.allPages) return undefined;
    for (const other of opts.allPages()) {
        if (!other || other === page || other.id === page.id) continue;
        const found = getList(other).find((r) => String(r.id) === linkedId);
        if (found) return found;
    }
    return undefined;
}

/**
 * Connector rule (Task 7). A pasted line's `q_data` domain carries the
 * ORIGINAL line's `sourceId`/`targetId`/`name` verbatim -- same as every
 * other typed rule, Lucid copies shapeData wholesale. The pasted LINE itself
 * is attached to fresh blocks though (paste clones connections along with
 * shapeData), so the stored pointers name the wrong blocks until this rule
 * overlays what the line is ACTUALLY attached to now.
 *
 * That overlay is `liveEndpointIds` -- the exact same "live line wins, a
 * DETACHED endpoint keeps the stored value" rule
 * `ConnectorLucid.refreshEndpointIds` applies at read/write-back time,
 * pulled into a shared helper so this rule and that one can never drift
 * apart (see the doc comment on `liveEndpointIds` in ConnectorLucid.ts).
 *
 * `name` is regenerated to the "A → B" form -- via `pickConnectorName`, the
 * SAME function `ConnectorLucid.createFromConversion` uses -- ONLY when
 * BOTH endpoints (after the overlay) resolve to a block on this page whose
 * OWN stored `q_data` carries a `name`. An endpoint that doesn't resolve to
 * a block, or resolves to one with no stored name, means there is no honest
 * answer to derive from, so the inherited name is left exactly as pasted --
 * the same posture `connectorLucid.liveEndpoints.test.ts` documents for
 * `updateFromPlatform` (a name is user-editable text, not something a rule
 * should fight over without a real reason).
 *
 * Single write, same pattern as the other typed rules: this case never also
 * calls `restampEnvelope`. Once written, the stored ids agree with the live
 * line and the stored name (when regenerated) agrees with the live
 * endpoints' stored names, so a second pass computes the identical values
 * and its write is a no-op read back -- idempotent.
 */
function normalizeConnector(item: ItemProxy, page: PageProxy, sa: StorageAdapter, result: PasteNormalizationResult): void {
    const typeInfo = sa.getElementType(item)!;
    const data = (sa.getElementData(item) ?? {}) as Record<string, unknown>;
    const { id: _old, type: _t, ...domain } = data;

    const line = item as LineProxy;
    const overlay = liveEndpointIds(line);
    if (overlay.sourceId) domain.sourceId = overlay.sourceId;
    if (overlay.targetId) domain.targetId = overlay.targetId;

    const sourceName = endpointStoredName(page, sa, domain.sourceId);
    const targetName = endpointStoredName(page, sa, domain.targetId);
    if (sourceName && targetName) {
        domain.name = pickConnectorName(lineToNameable(line), { sourceName, targetName });
    }

    sa.setElementData(item, { id: item.id, ...domain } as { id: string }, SimulationObjectType.Connector, {
        mappingSource: typeInfo.mappingSource,
    });
    result.changed = true;
}

/** The stored `name` of the block `id` names on `page`, when it resolves to a block AND that block has a stored name. */
function endpointStoredName(page: PageProxy, sa: StorageAdapter, id: unknown): string | undefined {
    if (typeof id !== 'string' || !id) return undefined;
    const block = page.allBlocks.get(id);
    if (!block) return undefined;
    const blockData = sa.getElementData<{ name?: string }>(block);
    return blockData?.name || undefined;
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

/* ------------------------------------------------------------------------ *
 * Task 8: PAGE-DUPLICATE mode
 * ------------------------------------------------------------------------ */

const MODEL_DATA_KEY = 'q_data';

/** A raw (unparsed-then-reparsed) `q_data` blob plus the string it came from. */
interface RawEnvelopeBlob {
    raw: string;
    parsed: Record<string, unknown>;
}

/** Reads an element's `q_data` as raw JSON, bypassing StorageAdapter's flatten/re-serialize round-trip. */
function readRawEnvelope(element: { shapeData: { get(key: string): unknown } }): RawEnvelopeBlob | null {
    const raw = element.shapeData.get(MODEL_DATA_KEY);
    if (typeof raw !== 'string' || !raw) return null;
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return { raw, parsed: parsed as Record<string, unknown> };
    } catch {
        return null;
    }
}

/**
 * The page's own `q_data` Model envelope when it names a DIFFERENT page --
 * i.e. this page is a duplicate of the one the envelope was written for.
 * Lucid's page duplication copies shapeData byte-for-byte, so the stored id
 * is the only witness. A page with no `q_data` (never converted) is never in
 * page mode.
 */
function duplicatedPageEnvelope(page: PageProxy, opts: PasteNormalizerOptions): RawEnvelopeBlob | null {
    const blob = readRawEnvelope(page as unknown as { shapeData: { get(key: string): unknown } });
    if (!blob) return null;
    const storedId = blob.parsed.id;
    if (typeof storedId !== 'string' || !storedId || storedId === page.id) return null;

    // Witness requirement (review 1.2). A stale envelope id is only evidence of
    // a DUPLICATION when some other page actually carries that id -- the page
    // the copy was made from. Without this, any page whose `q_data.id` went
    // stale for an unrelated reason would be treated as a duplicate and have
    // its run state wiped and its per-item rules suppressed. That is reachable:
    // `modelOpsHandler`/`simulationHandler` used to initialize a page's Model
    // with the DOCUMENT id, and a document id matches no page. The check needs
    // the document's page list, so it only applies when `opts.allPages` is
    // supplied (production always supplies it -- see pasteHookWiring); without
    // it there is nothing to witness against and id-only detection stands.
    if (opts.allPages) {
        const witnessed = opts.allPages().some((other) => !!other && other.id !== page.id && other.id === storedId);
        if (!witnessed) return null;
    }
    return blob;
}

/**
 * Page-duplicate mode. A duplicated page is SELF-CONSISTENT: every id its
 * copied envelopes name is unique within the new page, and the model-level
 * lists (`q_resources`, `q_arrival_patterns`, ...) came across intact. So
 * nothing is cloned and nothing is re-minted here -- doing either would
 * manufacture a second copy of a record the page already owns outright, and
 * would gratuitously break the pointers that already resolve. What IS broken
 * is only identity plumbing, and this repairs exactly that:
 *
 *   1. the page envelope's stored `id` (ruling R2: edited in the RAW JSON,
 *      never through `setElementData` -- see `restampPageEnvelope`);
 *   2. every batch item's envelope id, via the generic `restampEnvelope`;
 *   3. every swimlane lane's `laneId`, which arrives as a copy of the SOURCE
 *      page's and would otherwise read as a paste to the swimlane rule later
 *      on -- identity only, the lane's `resourceId` link is preserved (see
 *      `remintDuplicatedLanes`);
 *   4. every LINE on the page -- `page.allLines`, not just the batch, since
 *      Lucid need not hand us every item in one callback -- whose stored
 *      endpoints still name the SOURCE page's blocks while the live line is
 *      attached to the new ones, and whose envelope id an off-batch line
 *      would otherwise keep from the source (see `repairLineEnvelope`);
 *   5. the copied run state, which describes a run that never happened on
 *      this page (ruling R3: `clearSimulationStatus`).
 *
 * Idempotent: after step 1 the page envelope id equals `page.id`, so a second
 * pass is not in page mode at all; its items' envelopes already match, so the
 * per-item loop skips them; and `overlayLineEndpoints` would compute the
 * identical bytes, which is why it skips the write when nothing changes.
 */
function normalizeDuplicatedPage(
    page: PageProxy,
    pageItems: ItemProxy[],
    envelope: RawEnvelopeBlob,
    sa: StorageAdapter,
    result: PasteNormalizationResult
): void {
    restampPageEnvelope(page, envelope);

    // Step 2 covers EVERY block on the page, not just the batch (review 1.3).
    // Step 1 has just destroyed the only witness this detection has: the page
    // envelope now names this page, so a block arriving in a LATER
    // hookCreateItems callback would no longer be recognised as part of a
    // duplication and would take the per-item rules -- cloning records this
    // page already owns. Re-stamping every block now means a later callback
    // finds nothing left to do. Same argument the brief makes for
    // `page.allLines` in step 3.
    for (const [, block] of page.allBlocks) restampIfStale(block, sa);
    // Batch items that are not blocks of this page -- lines, chiefly -- still
    // need their envelope id; `restampIfStale` makes the overlap a no-op.
    for (const item of pageItems) restampIfStale(item, sa);

    remintDuplicatedLanes(page);

    for (const [, line] of page.allLines) {
        try {
            repairLineEnvelope(line);
        } catch (error) {
            log.error('Duplicated-page line endpoint repair failed; left as duplicated', { lineId: line.id, error });
        }
    }

    sa.clearSkippedElements(page);
    sa.clearSimulationStatus(page);

    result.changed = true;
    result.notices.push('Duplicated page normalized');
}

/**
 * Re-stamps one item's envelope id, when it has an envelope and that envelope
 * names something other than the item. A failure is logged and swallowed so
 * one unreadable envelope cannot abort the rest of the page's repair.
 */
function restampIfStale(item: ItemProxy, sa: StorageAdapter): void {
    try {
        if (!isPastedItem(item, sa)) return;   // no envelope, or already ours
        restampEnvelope(item, sa);
    } catch (error) {
        log.error('Duplicated-page item re-stamp failed; left as duplicated', { itemId: item.id, error });
    }
}

/**
 * Re-stamps the page envelope's `id` (and `domain.id`, when a legacy blob
 * carried one) by editing the RAW JSON in place.
 *
 * Ruling R2: this deliberately does NOT go through
 * `StorageAdapter.setElementData`. That path rewrites a Model envelope's
 * top-level `version` marker to the running `MODEL_SCHEMA_VERSION`, which
 * would tell `LucidPreflightChecker.getPageVersion` the page is already
 * current and silently skip every pending schema upgrade. Duplicating a page
 * must not upgrade it. Every other byte of the envelope -- `version`,
 * `schemaVersion`, `platform`, `domain` -- is carried through untouched.
 */
function restampPageEnvelope(page: PageProxy, envelope: RawEnvelopeBlob): void {
    const next = envelope.parsed;
    next.id = page.id;
    const domain = next.domain;
    if (domain && typeof domain === 'object' && !Array.isArray(domain) && (domain as Record<string, unknown>).id !== undefined) {
        (domain as Record<string, unknown>).id = page.id;
    }
    page.shapeData.set(MODEL_DATA_KEY, JSON.stringify(next));
}

/**
 * Repairs one line's stored envelope on a duplicated page, editing the raw
 * `q_data` JSON so `type`, `platform.mappingSource`, `schemaVersion` and every
 * other domain field are carried through verbatim. Two repairs, one write:
 *
 *   - the LIVE attached endpoints are overlaid onto the stored
 *     `sourceId`/`targetId`. A detached end (no live connection) keeps its
 *     stored value -- the same `liveEndpointIds` rule the Connector paste rule
 *     and `ConnectorLucid.refreshEndpointIds` share.
 *   - the envelope `id` is re-stamped to the line's own id. Batch lines get
 *     that from step 2 anyway; this is what leaves an OFF-BATCH line fully
 *     normalized instead of still naming the source page's line (round 2).
 *
 * Runs over EVERY line on a duplicated page, including lines whose envelope id
 * already matches: a duplicated line's stored endpoints name the SOURCE page's
 * blocks regardless of whose id the envelope carries, and only the live line
 * knows the new ones.
 *
 * Writes only when the serialized result actually differs, so a second pass
 * over an already-repaired page writes nothing at all.
 */
function repairLineEnvelope(line: LineProxy): void {
    const blob = readRawEnvelope(line as unknown as { shapeData: { get(key: string): unknown } });
    if (!blob) return;

    const parsed = blob.parsed;
    const domain = (parsed.domain && typeof parsed.domain === 'object' && !Array.isArray(parsed.domain))
        ? (parsed.domain as Record<string, unknown>)   // envelope
        : parsed;                                       // legacy flat blob

    const overlay = liveEndpointIds(line);
    if (overlay.sourceId) domain.sourceId = overlay.sourceId;
    if (overlay.targetId) domain.targetId = overlay.targetId;

    if (typeof parsed.id === 'string' && parsed.id !== line.id) {
        parsed.id = line.id;
        if (domain !== parsed && domain.id !== undefined) domain.id = line.id;
    }

    const next = JSON.stringify(parsed);
    if (next === blob.raw) return;
    line.shapeData.set(MODEL_DATA_KEY, next);
}

/**
 * Re-mints every swimlane lane's `laneId` on a duplicated page -- identity
 * only. `titleSnapshot`, `assignmentMode` and above all `resourceId` are
 * preserved exactly: the duplicated page's `q_resources` came across intact,
 * so those links still resolve and unlinking them would destroy working state.
 *
 * The re-mint is what makes that preservation last. A duplicated lane arrives
 * carrying the SOURCE page's `laneId`, and a laneId collision is precisely
 * what `isPastedSwimlaneBlock` reads as "this is a paste" -- so a lane left
 * with the source's id would be rewritten, and unlinked, by the first later
 * pass that happened to carry this swimlane in its batch. Fresh laneIds remove
 * the collision, so that later pass correctly sees a non-paste. Write shape
 * (`{ lanes, lastSyncedAt }`) matches `normalizeSwimlane` and
 * `SwimLaneHandler.handleUpdate`.
 */
function remintDuplicatedLanes(page: PageProxy): void {
    for (const [, block] of page.allBlocks) {
        try {
            if (block.getClassName() !== 'AdvancedSwimLaneBlock') continue;
            const raw = block.shapeData.get(SWIMLANE_DATA_KEY);
            if (typeof raw !== 'string' || !raw) continue;
            let swim: SwimLaneQuodsiData | null = null;
            try {
                swim = JSON.parse(raw) as SwimLaneQuodsiData;
            } catch {
                continue;
            }
            if (!swim || !Array.isArray(swim.lanes) || swim.lanes.length === 0) continue;

            const lanes: (SwimLaneLaneMapping | null)[] = swim.lanes.map((lane) =>
                lane ? { ...lane, laneId: generateUUID() } : null
            );
            const next: SwimLaneQuodsiData = { lanes, lastSyncedAt: new Date().toISOString() };
            block.shapeData.set(SWIMLANE_DATA_KEY, JSON.stringify(next));
        } catch (error) {
            log.error('Duplicated-page lane re-mint failed; lanes left as duplicated', { blockId: block.id, error });
        }
    }
}
