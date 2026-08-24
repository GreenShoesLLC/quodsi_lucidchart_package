// tests/core/pasteNormalizer.pageDuplicate.test.ts
//
// Task 8 of the LucidChart Paste Normalizer plan: PAGE-DUPLICATE mode.
//
// When a WHOLE page is duplicated, Lucid copies every shapeData string --
// the page's own `q_data` Model envelope and its model-level lists
// (`q_resources`, `q_arrival_patterns`, ...) included -- onto a brand new
// page whose blocks and lines all carry new ids. The result is
// SELF-CONSISTENT: every id the copied envelopes name is unique within the
// new page, and the model-level lists came across intact. Nothing needs
// cloning. What is actually broken is only identity plumbing:
//
//   - the page envelope's stored `id` still names the SOURCE page;
//   - every item's envelope `id` still names the SOURCE item;
//   - every line's STORED `sourceId`/`targetId` still name the SOURCE page's
//     blocks (the live line is attached to the NEW blocks);
//   - the copied run state (`q_skipped_elements`, `q_simulation_status`)
//     describes a run that never happened on this page.
//
// So page mode re-stamps and repairs, and does NOT run any per-item rule:
// no resource cloning, no pattern/schedule cloning, no action re-minting,
// no swimlane lane rewrite.
//
// Ruling R2: the page envelope re-stamp edits the RAW `q_data` JSON's `id`
// only. A `setElementData` round-trip would restamp the top-level `version`
// marker to the current MODEL_SCHEMA_VERSION and thereby silently skip any
// pending schema upgrade -- `LucidPreflightChecker.getPageVersion` is the
// reader of that marker. The source page below is stamped with a
// deliberately OLD version so that preservation is observable.
//
// Review round 1 added three things this suite pins:
//   - detection NEVER falls back to the per-item rules once it has fired
//     (they are known-wrong for a duplicated page);
//   - when `opts.allPages` is supplied, the stale envelope id must be
//     WITNESSED by an existing page (the duplication source). That rules out
//     the reachable production false positive where a page's `q_data.id` was
//     stamped with the DOCUMENT id;
//   - every BLOCK on the page is re-stamped, not just the batch, because
//     step 1 destroys the detection witness for any later callback.
//
// Fabrication: build a SOURCE page through the real adapters, then copy
// every shapeData string byte-for-byte onto a new page / new-id blocks and
// lines, with the new lines' LIVE endpoints attached to the NEW blocks.
// That is exactly what Lucid's page duplication leaves behind.

import { ISerializedArrivalPattern, PageStatus, SimulationObjectType, StoredResourceRecord, SwimLaneQuodsiData } from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { normalizePastedItems, PasteNormalizerOptions } from '../../src/core/PasteNormalizer';
import { makeFakeBlock, makeFakeLine, makeFakePage, addBlock, addLine } from '../helpers/fakeProxies';

/** Deliberately OLD: a `setElementData` round-trip would overwrite it with MODEL_SCHEMA_VERSION. */
const SOURCE_VERSION = '2026.08.20';

const RESOURCE: StoredResourceRecord = { id: 'res-1', name: 'Nurse', capacity: 2 };

const PATTERN: ISerializedArrivalPattern = {
    id: 'pattern-1',
    name: 'Weekday rush',
    cycle: 'weekly',
    hourWeights: [1, 2, 3],
};

const STATUS: PageStatus = { hasContainer: true, simulationRuns: [], statusDateTime: '2026-08-20T00:00:00.000Z' };

const SWIMLANE: SwimLaneQuodsiData = {
    lanes: [{ laneId: 'lane-1', titleSnapshot: 'Nurses', assignmentMode: 'explicit', resourceId: 'res-1' }],
    lastSyncedAt: '2026-08-20T00:00:00.000Z',
};

/** Every page-level shapeData key the source page below writes. */
const PAGE_KEYS = ['q_data', 'q_resources', 'q_arrival_patterns', 'q_skipped_elements', 'q_simulation_status'] as const;

type Fixture = {
    page: any;
    resBlock: any;
    actBlock: any;
    /** A second Activity block, deliberately kept OUT of the batch. */
    offBatchBlock: any;
    genBlock: any;
    swimlane: any;
    line: any;
    /** A second line, deliberately kept OUT of the batch. */
    otherLine: any;
};

/** A fully-authored page, written through the real StorageAdapter. */
function buildSourcePage(sa: StorageAdapter): Fixture {
    const page = makeFakePage('page-src');
    sa.setElementData(page, { id: 'page-src', name: 'Clinic' } as { id: string }, SimulationObjectType.Model, {
        version: SOURCE_VERSION,
    });
    sa.setResources(page, [RESOURCE]);
    sa.setArrivalPatterns(page, [PATTERN]);
    sa.setSkippedElements(page, { 'src-note': 'user' });
    sa.setSimulationStatus(page, STATUS);

    const resBlock = addBlock(page, makeFakeBlock('src-res'));
    sa.setElementData(resBlock, { id: 'src-res', resourceId: 'res-1' }, SimulationObjectType.Resource, { mappingSource: 'user' });

    const activity = (blockId: string, name: string, actionId: string, leverId: string): any => {
        const block = addBlock(page, makeFakeBlock(blockId));
        sa.setElementData(
            block,
            { id: blockId, name, actions: [{ id: actionId, type: 'Delay' }], levers: [{ leverId, actionId }] } as any,
            SimulationObjectType.Activity,
            { mappingSource: 'user' }
        );
        return block;
    };
    const actBlock = activity('src-act', 'Triage', 'action-1', 'lever-1');
    const offBatchBlock = activity('src-act-2', 'Exam', 'action-2', 'lever-2');

    const genBlock = addBlock(page, makeFakeBlock('src-gen'));
    sa.setElementData(
        genBlock,
        { id: 'src-gen', name: 'Arrivals', entityId: 'entity-1', arrivalPatternId: 'pattern-1' },
        SimulationObjectType.Generator,
        { mappingSource: 'user' }
    );

    const swimlane = addBlock(page, makeFakeBlock('src-swim', { className: 'AdvancedSwimLaneBlock' }));
    swimlane.shapeData.set('q_swimlane', JSON.stringify(SWIMLANE));

    const connector = (lineId: string, name: string, sourceId: string, targetId: string): any => {
        const newLine = addLine(
            page,
            makeFakeLine(lineId, { endpoint1: { connection: { id: sourceId } }, endpoint2: { connection: { id: targetId } } })
        );
        sa.setElementData(newLine, { id: lineId, name, sourceId, targetId, weight: 1 }, SimulationObjectType.Connector, {
            mappingSource: 'user',
        });
        return newLine;
    };
    const line = connector('src-line', 'Arrivals → Triage', 'src-gen', 'src-act');
    const otherLine = connector('src-line-2', 'Triage → Exam', 'src-act', 'src-act-2');

    return { page, resBlock, actBlock, offBatchBlock, genBlock, swimlane, line, otherLine };
}

/**
 * What Lucid's page duplication produces: a NEW page whose shapeData strings
 * are byte-for-byte copies of the source's, holding NEW-id blocks and lines
 * that each carry the SOURCE item's shapeData strings, with the new lines'
 * LIVE endpoints attached to the NEW blocks.
 */
function duplicatePage(source: Fixture): Fixture {
    const page = makeFakePage('page-dup');
    for (const key of PAGE_KEYS) {
        const value = source.page.shapeData.get(key);
        if (value !== undefined) page.shapeData.set(key, value);
    }

    const copyBlock = (srcBlock: any, newId: string, dataKey = 'q_data', className?: string): any => {
        const block = addBlock(page, makeFakeBlock(newId, className ? { className } : {}));
        block.shapeData.set(dataKey, srcBlock.shapeData.get(dataKey)!);
        return block;
    };
    const resBlock = copyBlock(source.resBlock, 'dup-res');
    const actBlock = copyBlock(source.actBlock, 'dup-act');
    const offBatchBlock = copyBlock(source.offBatchBlock, 'dup-act-2');
    const genBlock = copyBlock(source.genBlock, 'dup-gen');
    const swimlane = copyBlock(source.swimlane, 'dup-swim', 'q_swimlane', 'AdvancedSwimLaneBlock');

    const copyLine = (srcLine: any, newId: string, endpoint1: string, endpoint2: string): any => {
        const newLine = addLine(
            page,
            makeFakeLine(newId, { endpoint1: { connection: { id: endpoint1 } }, endpoint2: { connection: { id: endpoint2 } } })
        );
        newLine.shapeData.set('q_data', srcLine.shapeData.get('q_data')!);
        return newLine;
    };
    const line = copyLine(source.line, 'dup-line', 'dup-gen', 'dup-act');
    const otherLine = copyLine(source.otherLine, 'dup-line-2', 'dup-act', 'dup-act-2');

    return { page, resBlock, actBlock, offBatchBlock, genBlock, swimlane, line, otherLine };
}

/** The batch Lucid hands the hook. `offBatchBlock` and `otherLine` are deliberately left OUT. */
function batchOf(dup: Fixture): any[] {
    return [dup.resBlock, dup.actBlock, dup.genBlock, dup.swimlane, dup.line];
}

/**
 * Production always supplies `allPages`, and page mode then demands a WITNESS:
 * an existing page whose id equals the stale envelope id. Here the source page
 * is that witness.
 */
function pageModeOpts(source: Fixture, dup: Fixture): PasteNormalizerOptions {
    return { allPages: () => [source.page, dup.page] };
}

describe('PasteNormalizer — duplicated pages (Task 8)', () => {
    it('re-stamps the page envelope id while preserving the top-level version marker', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        normalizePastedItems(batchOf(dup), sa, pageModeOpts(source, dup));

        const envelope = JSON.parse(dup.page.shapeData.get('q_data')!);
        expect(envelope.id).toBe('page-dup');
        expect(envelope.version).toBe(SOURCE_VERSION);   // NOT restamped to MODEL_SCHEMA_VERSION
        expect(envelope.type).toBe(SimulationObjectType.Model);
        // The source page is untouched.
        expect(JSON.parse(source.page.shapeData.get('q_data')!).id).toBe('page-src');
    });

    it('re-stamps every batch item envelope', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        normalizePastedItems(batchOf(dup), sa, pageModeOpts(source, dup));

        expect(sa.getElementData<{ id: string }>(dup.resBlock)!.id).toBe('dup-res');
        expect(sa.getElementData<{ id: string }>(dup.actBlock)!.id).toBe('dup-act');
        expect(sa.getElementData<{ id: string }>(dup.genBlock)!.id).toBe('dup-gen');
        expect(sa.getElementData<{ id: string }>(dup.line)!.id).toBe('dup-line');
    });

    it('clones NOTHING: model-level lists and every pointer into them survive byte-for-byte', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        normalizePastedItems(batchOf(dup), sa, pageModeOpts(source, dup));

        expect(dup.page.shapeData.get('q_resources')).toBe(source.page.shapeData.get('q_resources'));
        expect(dup.page.shapeData.get('q_arrival_patterns')).toBe(source.page.shapeData.get('q_arrival_patterns'));
        expect(sa.getResources(dup.page)).toHaveLength(1);
        expect(sa.getArrivalPatterns(dup.page)).toHaveLength(1);
        // and the pointers still name the ONE record each list holds
        expect(sa.getElementData<{ resourceId: string }>(dup.resBlock)!.resourceId).toBe('res-1');
        expect(sa.getElementData<{ arrivalPatternId: string }>(dup.genBlock)!.arrivalPatternId).toBe('pattern-1');
    });

    it('does NOT re-mint activity action or lever ids, does not rename, and does not UNLINK swimlane lanes', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        normalizePastedItems(batchOf(dup), sa, pageModeOpts(source, dup));

        const data = sa.getElementData<{ name: string; actions: { id: string }[]; levers: { leverId: string; actionId: string }[] }>(dup.actBlock)!;
        expect(data.actions.map((a) => a.id)).toEqual(['action-1']);
        expect(data.levers).toEqual([{ leverId: 'lever-1', actionId: 'action-1' }]);
        expect(data.name).toBe('Triage');
        // The swimlane RULE would have dropped the lane's resourceId here
        // (`lane-1` collides with the source page's swimlane, which `allPages`
        // makes visible). Page mode re-mints the laneId instead and keeps the
        // link -- see the dedicated lane test below.
        const swim: SwimLaneQuodsiData = JSON.parse(dup.swimlane.shapeData.get('q_swimlane')!);
        expect(swim.lanes[0]!.resourceId).toBe('res-1');
    });

    it('rewrites every line on the page from its live endpoints — batch member or not', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        normalizePastedItems(batchOf(dup), sa, pageModeOpts(source, dup));

        const inBatch = sa.getElementData<{ sourceId: string; targetId: string }>(dup.line)!;
        expect(inBatch.sourceId).toBe('dup-gen');
        expect(inBatch.targetId).toBe('dup-act');

        // dup.otherLine was NOT in the batch; its stored endpoints still pointed
        // at the SOURCE page's blocks until the allLines walk repaired them.
        const offBatch = sa.getElementData<{ id: string; sourceId: string; targetId: string }>(dup.otherLine)!;
        expect(offBatch.sourceId).toBe('dup-act');
        expect(offBatch.targetId).toBe('dup-act-2');
        // ...and the same walk re-stamps its envelope id, so an off-batch line
        // ends FULLY normalized rather than still naming the source's line
        // (round 2 ruling).
        expect(offBatch.id).toBe('dup-line-2');
    });

    it('clears the copied run state and emits exactly one notice', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        const result = normalizePastedItems(batchOf(dup), sa, pageModeOpts(source, dup));

        expect(dup.page.shapeData.get('q_skipped_elements')).toBeUndefined();
        expect(dup.page.shapeData.get('q_simulation_status')).toBeUndefined();
        expect(sa.getSkippedElements(dup.page)).toEqual({});
        expect(sa.getSimulationStatus(dup.page)).toBeNull();
        expect(result.notices).toEqual(['Duplicated page normalized']);
        expect(result.changed).toBe(true);
        // the source page keeps its own run state
        expect(sa.getSimulationStatus(source.page)).not.toBeNull();
    });

    it('is idempotent: a second pass writes nothing', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);
        const opts = pageModeOpts(source, dup);

        normalizePastedItems(batchOf(dup), sa, opts);
        const after = {
            page: PAGE_KEYS.map((key) => dup.page.shapeData.get(key)),
            res: dup.resBlock.shapeData.get('q_data'),
            act: dup.actBlock.shapeData.get('q_data'),
            offBatchBlock: dup.offBatchBlock.shapeData.get('q_data'),
            gen: dup.genBlock.shapeData.get('q_data'),
            swimlane: dup.swimlane.shapeData.get('q_swimlane'),
            line: dup.line.shapeData.get('q_data'),
            otherLine: dup.otherLine.shapeData.get('q_data'),
        };

        const second = normalizePastedItems(batchOf(dup), sa, opts);

        expect(second.changed).toBe(false);
        expect(second.notices).toEqual([]);
        expect(PAGE_KEYS.map((key) => dup.page.shapeData.get(key))).toEqual(after.page);
        expect(dup.resBlock.shapeData.get('q_data')).toBe(after.res);
        expect(dup.actBlock.shapeData.get('q_data')).toBe(after.act);
        expect(dup.offBatchBlock.shapeData.get('q_data')).toBe(after.offBatchBlock);
        expect(dup.genBlock.shapeData.get('q_data')).toBe(after.gen);
        expect(dup.swimlane.shapeData.get('q_swimlane')).toBe(after.swimlane);
        expect(dup.line.shapeData.get('q_data')).toBe(after.line);
        expect(dup.otherLine.shapeData.get('q_data')).toBe(after.otherLine);
    });

    // Round 2 ruling. A duplicated page's lanes must keep their `resourceId`
    // links -- `q_resources` came across intact, so those links still resolve
    // and unlinking them would destroy working state. But the lanes also
    // arrive carrying the SOURCE page's `laneId`s, and a laneId collision is
    // precisely what the swimlane paste rule reads as "this is a paste": left
    // alone, the first later pass carrying this swimlane would rewrite the
    // lanes and drop exactly the links page mode preserved. So page mode
    // re-mints the laneIds -- identity only -- and keeps everything else.
    it('re-mints every swimlane laneId while preserving titleSnapshot, assignmentMode and resourceId', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);
        const opts = pageModeOpts(source, dup);

        normalizePastedItems(batchOf(dup), sa, opts);

        const after: SwimLaneQuodsiData = JSON.parse(dup.swimlane.shapeData.get('q_swimlane')!);
        expect(after.lanes).toHaveLength(1);
        expect(after.lanes[0]!.laneId).not.toBe('lane-1');            // fresh identity: collision gone
        expect(after.lanes[0]!.titleSnapshot).toBe('Nurses');
        expect(after.lanes[0]!.assignmentMode).toBe('explicit');
        expect(after.lanes[0]!.resourceId).toBe('res-1');              // link PRESERVED
        // the source page's swimlane is untouched
        expect(source.swimlane.shapeData.get('q_swimlane')).toBe(JSON.stringify(SWIMLANE));
    });

    it('a later batch carrying the duplicated swimlane is a no-op: the laneId collision is gone', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);
        const opts = pageModeOpts(source, dup);

        normalizePastedItems(batchOf(dup), sa, opts);
        const captured = dup.swimlane.shapeData.get('q_swimlane');

        const second = normalizePastedItems([dup.swimlane], sa, opts);

        expect(second.changed).toBe(false);
        expect(second.notices).toEqual([]);
        expect(dup.swimlane.shapeData.get('q_swimlane')).toBe(captured);
    });

    it('page mode is NOT entered when the page envelope id already matches: per-item rules apply', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);

        // A normal paste ONTO the source page: the page envelope is correct,
        // only the pasted block carries a foreign envelope id.
        const pasted = addBlock(source.page, makeFakeBlock('pasted-act'));
        pasted.shapeData.set('q_data', source.actBlock.shapeData.get('q_data')!);

        const result = normalizePastedItems([pasted], sa, { allPages: () => [source.page] });

        const data = sa.getElementData<{ id: string; name: string; actions: { id: string }[]; levers: { leverId: string }[] }>(pasted)!;
        expect(data.id).toBe('pasted-act');
        expect(data.actions[0].id).not.toBe('action-1');          // re-minted: per-item Activity rule ran
        expect(data.levers[0].leverId).not.toBe('lever-1');
        expect(data.name).not.toBe('Triage');                      // deduped against the original
        expect(result.notices).not.toContain('Duplicated page normalized');
        // and the page's own run state is left alone
        expect(sa.getSimulationStatus(source.page)).not.toBeNull();
    });
});

describe('PasteNormalizer — page mode never falls back to the per-item rules (review 1.1)', () => {
    it('a throw mid-repair leaves the page half-repaired but NEVER runs the per-item or swimlane rules', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);
        jest.spyOn(sa, 'clearSkippedElements').mockImplementation(() => {
            throw new Error('storage unavailable');
        });

        // No throw escapes: the caller's paste is never lost.
        expect(() => normalizePastedItems(batchOf(dup), sa, pageModeOpts(source, dup))).not.toThrow();

        // Nothing cloned -- the per-item Resource/Generator rules never ran.
        expect(dup.page.shapeData.get('q_resources')).toBe(source.page.shapeData.get('q_resources'));
        expect(dup.page.shapeData.get('q_arrival_patterns')).toBe(source.page.shapeData.get('q_arrival_patterns'));
        // No action re-mint -- the per-item Activity rule never ran.
        expect(sa.getElementData<{ actions: { id: string }[] }>(dup.actBlock)!.actions.map((a) => a.id)).toEqual(['action-1']);
        // The lane keeps its resource link -- the swimlane RULE, which always
        // unlinks, never ran (it WOULD have fired: `lane-1` collides with the
        // source page's swimlane). Page mode's own laneId re-mint is what ran.
        const swim: SwimLaneQuodsiData = JSON.parse(dup.swimlane.shapeData.get('q_swimlane')!);
        expect(swim.lanes[0]!.resourceId).toBe('res-1');
        expect(swim.lanes[0]!.laneId).not.toBe('lane-1');

        jest.restoreAllMocks();
    });
});

describe('PasteNormalizer — page mode needs a witness when allPages is supplied (review 1.2)', () => {
    /**
     * The false positive this closes: `modelOpsHandler`/`simulationHandler`
     * historically stamped a page's `q_data.id` with the DOCUMENT id. That id
     * matches no page, so the stale envelope has no duplication source and the
     * page must NOT be treated as a duplicate.
     */
    it('a stale envelope id that matches no other page is NOT a duplication: per-item rules run', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);
        // Re-stamp the page envelope with a document id: stale, but no page owns it.
        const envelope = JSON.parse(dup.page.shapeData.get('q_data')!);
        envelope.id = 'document-abc';
        dup.page.shapeData.set('q_data', JSON.stringify(envelope));

        const result = normalizePastedItems(batchOf(dup), sa, { allPages: () => [source.page, dup.page] });

        expect(result.notices).not.toContain('Duplicated page normalized');
        expect(JSON.parse(dup.page.shapeData.get('q_data')!).id).toBe('document-abc');   // envelope left alone
        expect(sa.getSimulationStatus(dup.page)).not.toBeNull();                          // run state kept
        expect(sa.getSkippedElements(dup.page)).toEqual({ 'src-note': 'user' });
        // per-item rules ran instead
        expect(sa.getElementData<{ actions: { id: string }[] }>(dup.actBlock)!.actions.map((a) => a.id)).not.toEqual(['action-1']);
    });

    it('a stale envelope id that names an existing page IS a duplication', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        const result = normalizePastedItems(batchOf(dup), sa, { allPages: () => [source.page, dup.page] });

        expect(result.notices).toEqual(['Duplicated page normalized']);
        expect(JSON.parse(dup.page.shapeData.get('q_data')!).id).toBe('page-dup');
    });

    it('without allPages (no page list to witness against) id-only detection stands', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        const result = normalizePastedItems(batchOf(dup), sa);

        expect(result.notices).toEqual(['Duplicated page normalized']);
        expect(JSON.parse(dup.page.shapeData.get('q_data')!).id).toBe('page-dup');
    });
});

describe('PasteNormalizer — page mode covers items outside the batch (review 1.3)', () => {
    it('re-stamps EVERY block on the page, and a later callback carrying only that block is a no-op', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        normalizePastedItems(batchOf(dup), sa, pageModeOpts(source, dup));

        // `offBatchBlock` was never in the batch. Step 1 has already re-stamped
        // the page envelope, so a later callback can no longer detect the
        // duplication -- this block had to be repaired in the same pass.
        const data = sa.getElementData<{ id: string; name: string; actions: { id: string }[] }>(dup.offBatchBlock)!;
        expect(data.id).toBe('dup-act-2');
        expect(data.actions.map((a) => a.id)).toEqual(['action-2']);   // NOT re-minted
        expect(data.name).toBe('Exam');                                 // NOT renamed

        // A second callback carrying only that block writes nothing at all.
        const captured = dup.offBatchBlock.shapeData.get('q_data');
        const second = normalizePastedItems([dup.offBatchBlock], sa, pageModeOpts(source, dup));
        expect(second.changed).toBe(false);
        expect(dup.offBatchBlock.shapeData.get('q_data')).toBe(captured);
        expect(sa.getResources(dup.page)).toHaveLength(1);              // and clones nothing
    });
});

describe('PasteNormalizer — page mode detection guards (review 1, cheap guards)', () => {
    it('a page with NO q_data is never in page mode', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-bare');
        const source = buildSourcePage(sa);
        const pasted = addBlock(page, makeFakeBlock('pasted-act'));
        pasted.shapeData.set('q_data', source.actBlock.shapeData.get('q_data')!);

        const result = normalizePastedItems([pasted], sa, { allPages: () => [page] });

        expect(result.notices).not.toContain('Duplicated page normalized');
        expect(sa.getElementData<{ actions: { id: string }[] }>(pasted)!.actions.map((a) => a.id)).not.toEqual(['action-1']);
    });

    it('a page whose q_data does not parse is never in page mode', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-broken');
        page.shapeData.set('q_data', '{not json');
        const source = buildSourcePage(sa);
        const pasted = addBlock(page, makeFakeBlock('pasted-act'));
        pasted.shapeData.set('q_data', source.actBlock.shapeData.get('q_data')!);

        const result = normalizePastedItems([pasted], sa, { allPages: () => [page] });

        expect(result.notices).not.toContain('Duplicated page normalized');
        expect(page.shapeData.get('q_data')).toBe('{not json');
        expect(sa.getElementData<{ actions: { id: string }[] }>(pasted)!.actions.map((a) => a.id)).not.toEqual(['action-1']);
    });
});
