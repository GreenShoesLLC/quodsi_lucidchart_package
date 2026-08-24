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

import { ItemProxy, PageProxy } from 'lucid-extension-sdk';
import { SimulationObjectType, getLogger } from '@quodsi/lucid-shared';
import { StorageAdapter } from './StorageAdapter';

const log = getLogger('PasteNormalizer');

export interface PasteNormalizationResult {
    /** True when anything was written. */
    changed: boolean;
    /** Human sentences for the consumed-once notice channel, one per normalization performed. */
    notices: string[];
}

/** Exposed for tests: true when the stored envelope id differs from the item's own id. */
export function isPastedItem(item: ItemProxy, sa: StorageAdapter): boolean {
    const typeInfo = sa.getElementType(item);
    if (!typeInfo?.type) return false;
    const data = sa.getElementData(item) as { id?: string } | null;
    return !!data && data.id !== undefined && String(data.id) !== item.id;
}

export function normalizePastedItems(items: ItemProxy[], sa: StorageAdapter): PasteNormalizationResult {
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
                normalizeOne(item, page, sa, result);
            } catch (error) {
                log.error('Paste normalization failed for item; left as pasted', { itemId: item.id, error });
            }
        }
    }
    return result;
}

function normalizeOne(item: ItemProxy, page: PageProxy, sa: StorageAdapter, result: PasteNormalizationResult): void {
    const typeInfo = sa.getElementType(item)!;
    switch (typeInfo.type) {
        // Tasks 3-7 add Resource / swimlane-carrier / Activity / Generator / Connector cases.
        default:
            restampEnvelope(item, sa);
            result.changed = true;
    }
}

/** Re-write q_data so the stored id is the item's own id; type + mappingSource preserved. */
function restampEnvelope(item: ItemProxy, sa: StorageAdapter): void {
    const typeInfo = sa.getElementType(item)!;
    const data = sa.getElementData(item) as Record<string, unknown>;
    const { id: _old, type: _t, ...domain } = data;
    sa.setElementData(item, { id: item.id, ...domain } as { id: string }, typeInfo.type, { mappingSource: typeInfo.mappingSource });
}
