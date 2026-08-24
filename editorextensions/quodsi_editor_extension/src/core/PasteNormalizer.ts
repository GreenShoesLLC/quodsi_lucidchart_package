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

import { ItemProxy, PageProxy } from 'lucid-extension-sdk';
import {
    SimulationObjectType,
    StoredResourceRecord,
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
        // Tasks 4-7 add swimlane-carrier / Activity / Generator / Connector cases.
        case SimulationObjectType.Resource:
            normalizeResource(item, page, sa, result, opts);
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
 * True when something OTHER than `item` on this page still points at
 * `resourceId`: another Resource block's `q_data` pointer, or a swimlane lane
 * (`q_swimlane.lanes[n].resourceId`). Those are exactly the two claim sites
 * `resolveResourceLinks` reads, so this test agrees with the model builder's
 * notion of "claimed".
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

/** True when any lane on `block`'s q_swimlane is linked to `resourceId`. */
function laneClaims(block: { shapeData: { get(key: string): unknown } }, resourceId: string): boolean {
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
