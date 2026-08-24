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
// Fabrication: build a SOURCE page through the real adapters, then copy
// every shapeData string byte-for-byte onto a new page / new-id blocks and
// lines, with the new lines' LIVE endpoints attached to the NEW blocks.
// That is exactly what Lucid's page duplication leaves behind.

import { ISerializedArrivalPattern, PageStatus, SimulationObjectType, StoredResourceRecord } from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { normalizePastedItems } from '../../src/core/PasteNormalizer';
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

/** Every page-level shapeData key the source page below writes. */
const PAGE_KEYS = ['q_data', 'q_resources', 'q_arrival_patterns', 'q_skipped_elements', 'q_simulation_status'] as const;

type Fixture = { page: any; resBlock: any; actBlock: any; genBlock: any; line: any; otherLine: any };

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

    const actBlock = addBlock(page, makeFakeBlock('src-act'));
    sa.setElementData(
        actBlock,
        { id: 'src-act', name: 'Triage', actions: [{ id: 'action-1', type: 'Delay' }], levers: [{ leverId: 'lever-1', actionId: 'action-1' }] } as any,
        SimulationObjectType.Activity,
        { mappingSource: 'user' }
    );

    const genBlock = addBlock(page, makeFakeBlock('src-gen'));
    sa.setElementData(
        genBlock,
        { id: 'src-gen', name: 'Arrivals', entityId: 'entity-1', arrivalPatternId: 'pattern-1' },
        SimulationObjectType.Generator,
        { mappingSource: 'user' }
    );

    const line = addLine(
        page,
        makeFakeLine('src-line', { endpoint1: { connection: { id: 'src-gen' } }, endpoint2: { connection: { id: 'src-act' } } })
    );
    sa.setElementData(
        line,
        { id: 'src-line', name: 'Arrivals → Triage', sourceId: 'src-gen', targetId: 'src-act', weight: 1 },
        SimulationObjectType.Connector,
        { mappingSource: 'user' }
    );

    const otherLine = addLine(
        page,
        makeFakeLine('src-line-2', { endpoint1: { connection: { id: 'src-act' } }, endpoint2: { connection: { id: 'src-res' } } })
    );
    sa.setElementData(
        otherLine,
        { id: 'src-line-2', name: 'Triage → Nurse', sourceId: 'src-act', targetId: 'src-res', weight: 1 },
        SimulationObjectType.Connector,
        { mappingSource: 'user' }
    );

    return { page, resBlock, actBlock, genBlock, line, otherLine };
}

/**
 * What Lucid's page duplication produces: a NEW page whose shapeData strings
 * are byte-for-byte copies of the source's, holding NEW-id blocks and lines
 * that each carry the SOURCE item's `q_data` string, with the new lines'
 * LIVE endpoints attached to the NEW blocks.
 */
function duplicatePage(source: Fixture): Fixture {
    const page = makeFakePage('page-dup');
    for (const key of PAGE_KEYS) {
        const value = source.page.shapeData.get(key);
        if (value !== undefined) page.shapeData.set(key, value);
    }

    const copyBlock = (srcBlock: any, newId: string): any => {
        const block = addBlock(page, makeFakeBlock(newId));
        block.shapeData.set('q_data', srcBlock.shapeData.get('q_data')!);
        return block;
    };
    const resBlock = copyBlock(source.resBlock, 'dup-res');
    const actBlock = copyBlock(source.actBlock, 'dup-act');
    const genBlock = copyBlock(source.genBlock, 'dup-gen');

    const copyLine = (srcLine: any, newId: string, endpoint1: string, endpoint2: string): any => {
        const newLine = addLine(
            page,
            makeFakeLine(newId, { endpoint1: { connection: { id: endpoint1 } }, endpoint2: { connection: { id: endpoint2 } } })
        );
        newLine.shapeData.set('q_data', srcLine.shapeData.get('q_data')!);
        return newLine;
    };
    const line = copyLine(source.line, 'dup-line', 'dup-gen', 'dup-act');
    const otherLine = copyLine(source.otherLine, 'dup-line-2', 'dup-act', 'dup-res');

    return { page, resBlock, actBlock, genBlock, line, otherLine };
}

/** The batch Lucid hands the hook: the duplicated page's items. `otherLine` is deliberately left OUT. */
function batchOf(dup: Fixture): any[] {
    return [dup.resBlock, dup.actBlock, dup.genBlock, dup.line];
}

describe('PasteNormalizer — duplicated pages (Task 8)', () => {
    it('re-stamps the page envelope id while preserving the top-level version marker', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        normalizePastedItems(batchOf(dup), sa);

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

        normalizePastedItems(batchOf(dup), sa);

        expect(sa.getElementData<{ id: string }>(dup.resBlock)!.id).toBe('dup-res');
        expect(sa.getElementData<{ id: string }>(dup.actBlock)!.id).toBe('dup-act');
        expect(sa.getElementData<{ id: string }>(dup.genBlock)!.id).toBe('dup-gen');
        expect(sa.getElementData<{ id: string }>(dup.line)!.id).toBe('dup-line');
    });

    it('clones NOTHING: model-level lists and every pointer into them survive byte-for-byte', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        normalizePastedItems(batchOf(dup), sa);

        expect(dup.page.shapeData.get('q_resources')).toBe(source.page.shapeData.get('q_resources'));
        expect(dup.page.shapeData.get('q_arrival_patterns')).toBe(source.page.shapeData.get('q_arrival_patterns'));
        expect(sa.getResources(dup.page)).toHaveLength(1);
        expect(sa.getArrivalPatterns(dup.page)).toHaveLength(1);
        // and the pointers still name the ONE record each list holds
        expect(sa.getElementData<{ resourceId: string }>(dup.resBlock)!.resourceId).toBe('res-1');
        expect(sa.getElementData<{ arrivalPatternId: string }>(dup.genBlock)!.arrivalPatternId).toBe('pattern-1');
    });

    it('does NOT re-mint activity action or lever ids, and does not rename', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        normalizePastedItems(batchOf(dup), sa);

        const data = sa.getElementData<{ name: string; actions: { id: string }[]; levers: { leverId: string; actionId: string }[] }>(dup.actBlock)!;
        expect(data.actions.map((a) => a.id)).toEqual(['action-1']);
        expect(data.levers).toEqual([{ leverId: 'lever-1', actionId: 'action-1' }]);
        expect(data.name).toBe('Triage');
    });

    it('rewrites every line on the page from its live endpoints — batch member or not', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        normalizePastedItems(batchOf(dup), sa);

        const inBatch = sa.getElementData<{ sourceId: string; targetId: string }>(dup.line)!;
        expect(inBatch.sourceId).toBe('dup-gen');
        expect(inBatch.targetId).toBe('dup-act');

        // dup.otherLine was NOT in the batch; its stored endpoints still pointed
        // at the SOURCE page's blocks until the allLines walk repaired them.
        const offBatch = sa.getElementData<{ sourceId: string; targetId: string }>(dup.otherLine)!;
        expect(offBatch.sourceId).toBe('dup-act');
        expect(offBatch.targetId).toBe('dup-res');
    });

    it('clears the copied run state and emits exactly one notice', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);
        const dup = duplicatePage(source);

        const result = normalizePastedItems(batchOf(dup), sa);

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

        normalizePastedItems(batchOf(dup), sa);
        const after = {
            page: PAGE_KEYS.map((key) => dup.page.shapeData.get(key)),
            res: dup.resBlock.shapeData.get('q_data'),
            act: dup.actBlock.shapeData.get('q_data'),
            gen: dup.genBlock.shapeData.get('q_data'),
            line: dup.line.shapeData.get('q_data'),
            otherLine: dup.otherLine.shapeData.get('q_data'),
        };

        const second = normalizePastedItems(batchOf(dup), sa);

        expect(second.changed).toBe(false);
        expect(second.notices).toEqual([]);
        expect(PAGE_KEYS.map((key) => dup.page.shapeData.get(key))).toEqual(after.page);
        expect(dup.resBlock.shapeData.get('q_data')).toBe(after.res);
        expect(dup.actBlock.shapeData.get('q_data')).toBe(after.act);
        expect(dup.genBlock.shapeData.get('q_data')).toBe(after.gen);
        expect(dup.line.shapeData.get('q_data')).toBe(after.line);
        expect(dup.otherLine.shapeData.get('q_data')).toBe(after.otherLine);
    });

    it('page mode is NOT entered when the page envelope id already matches: per-item rules apply', () => {
        const sa = new StorageAdapter();
        const source = buildSourcePage(sa);

        // A normal paste ONTO the source page: the page envelope is correct,
        // only the pasted block carries a foreign envelope id.
        const pasted = addBlock(source.page, makeFakeBlock('pasted-act'));
        pasted.shapeData.set('q_data', source.actBlock.shapeData.get('q_data')!);

        const result = normalizePastedItems([pasted], sa);

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
