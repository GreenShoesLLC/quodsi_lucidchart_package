// tests/core/pasteNormalizer.generator.test.ts
//
// Task 6 of the LucidChart Paste Normalizer plan: the Generator-block rule.
// A pasted Generator block's `q_data` domain carries the ORIGINAL block's
// `arrivalPatternId`/`arrivalScheduleId`/`levers`/`entityId`/`name` verbatim
// (byte-for-byte -- that is what Lucid's copy/paste leaves on shapeData).
//
//   - `leverId`s are always re-minted fresh (generators have levers but no
//     actions, so there is no id map to repoint through -- unlike Activity).
//   - `entityId` is left byte-identical: it names an Entity, an identity
//     space this rule does not touch.
//   - the stored `name`, when present, is deduped against every OTHER
//     Generator's stored name on this page; only on an actual collision does
//     the name change, and only then does the rename notice fire.
//   - `arrivalPatternId`, when present, is resolved: found in THIS page's
//     `q_arrival_patterns` OR (via `opts.allPages`) another page's list ->
//     the pattern record is CLONED (fresh id, name deduped against this
//     page's pattern list) and appended to THIS page's list via
//     `setArrivalPatterns`; the paste is repointed at the clone. Resolves
//     nowhere -> the field is dropped from the domain entirely (absence is
//     itself a meaningful value here -- see GeneratorLucid.ts's
//     GENERATOR_CLEARABLE_KEYS note). Same three-way handling for
//     `arrivalScheduleId` against `q_arrival_schedules`.
//   - Unlike the Resource rule, a pattern/schedule found on THIS page is
//     ALWAYS cloned (no "no other claimant -> keep the pointer" branch):
//     patterns/schedules are 1:1-owned by their generator, so a paste must
//     never leave two generators pointing at the same pattern record.
//
// Fabrication pattern (same as the Activity/Resource suites): write q_data
// through the real StorageAdapter on a throwaway fake carrying the ORIGINAL
// id, then copy the raw q_data STRING onto a new-id fake. That is
// byte-for-byte what a Lucid paste leaves behind.

import { ISerializedArrivalPattern, ISerializedArrivalSchedule, SimulationObjectType } from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { normalizePastedItems } from '../../src/core/PasteNormalizer';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

/** A detached block whose q_data was written for a DIFFERENT id: a paste. */
function makePastedGeneratorBlock(sa: StorageAdapter, newId: string, originalId: string, domain: Record<string, unknown>): any {
    const throwaway = makeFakeBlock(originalId);
    sa.setElementData(throwaway, { id: originalId, ...domain } as { id: string }, SimulationObjectType.Generator, {
        mappingSource: 'user',
    });
    const rawQData = throwaway.shapeData.get('q_data');
    const block = makeFakeBlock(newId);
    block.shapeData.set('q_data', rawQData!);
    return block;
}

/** A NORMAL (not pasted) Generator block already living on `page`, with a stored name. */
function addGeneratorBlock(sa: StorageAdapter, page: any, blockId: string, name: string): any {
    const block = addBlock(page, makeFakeBlock(blockId));
    sa.setElementData(block, { id: blockId, name }, SimulationObjectType.Generator, { mappingSource: 'user' });
    return block;
}

const PATTERN: ISerializedArrivalPattern = {
    id: 'pattern-1',
    name: 'Weekday rush',
    cycle: 'weekly',
    hourWeights: [1, 2, 3],
};

const SCHEDULE: ISerializedArrivalSchedule = {
    id: 'schedule-1',
    name: 'Morning batch',
    timeUnit: 'minutes',
    arrivals: [{ time: 0, entityId: 'entity-1', quantity: 5 }],
};

describe('PasteNormalizer — Generator blocks (Task 6)', () => {
    it('same-page arrival pattern: clones it, repoints, and leaves the original generator + original pattern untouched', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        sa.setArrivalPatterns(page, [PATTERN]);
        const original = addBlock(
            page,
            (() => {
                const b = makeFakeBlock('block-orig');
                sa.setElementData(b, { id: 'block-orig', name: 'Arrivals', entityId: 'entity-1', arrivalPatternId: 'pattern-1' }, SimulationObjectType.Generator, { mappingSource: 'user' });
                return b;
            })()
        );
        const pasted = addBlock(
            page,
            makePastedGeneratorBlock(sa, 'block-new', 'block-orig', {
                name: 'Arrivals',
                entityId: 'entity-1',
                arrivalPatternId: 'pattern-1',
            })
        );

        const result = normalizePastedItems([pasted], sa);

        const patterns = sa.getArrivalPatterns(page);
        expect(patterns).toHaveLength(2);
        const clone = patterns.find((p) => p.id !== 'pattern-1')!;
        expect(clone.name).toBe('Weekday rush_2');
        expect(clone.id).not.toBe('pattern-1');
        expect(clone.cycle).toBe('weekly');
        expect(clone.hourWeights).toEqual([1, 2, 3]);

        const pastedData = sa.getElementData<{ arrivalPatternId: string }>(pasted)!;
        expect(pastedData.arrivalPatternId).toBe(clone.id);

        // Original pattern record untouched.
        expect(patterns.find((p) => p.id === 'pattern-1')).toEqual(PATTERN);
        // Original generator block untouched.
        expect(sa.getElementData<{ arrivalPatternId: string }>(original)!.arrivalPatternId).toBe('pattern-1');

        expect(result.changed).toBe(true);
        expect(result.notices).toContain('Pasted generator uses a new copy of its arrival pattern');
    });

    it('same-page arrival schedule: clones it, repoints, and leaves the original generator + original schedule untouched', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        sa.setArrivalSchedules(page, [SCHEDULE]);
        const original = addBlock(
            page,
            (() => {
                const b = makeFakeBlock('block-orig');
                sa.setElementData(b, { id: 'block-orig', name: 'Arrivals', entityId: 'entity-1', arrivalScheduleId: 'schedule-1' }, SimulationObjectType.Generator, { mappingSource: 'user' });
                return b;
            })()
        );
        const pasted = addBlock(
            page,
            makePastedGeneratorBlock(sa, 'block-new', 'block-orig', {
                name: 'Arrivals',
                entityId: 'entity-1',
                arrivalScheduleId: 'schedule-1',
            })
        );

        const result = normalizePastedItems([pasted], sa);

        const schedules = sa.getArrivalSchedules(page);
        expect(schedules).toHaveLength(2);
        const clone = schedules.find((s) => s.id !== 'schedule-1')!;
        expect(clone.name).toBe('Morning batch_2');
        expect(clone.id).not.toBe('schedule-1');
        expect(clone.timeUnit).toBe('minutes');
        expect(clone.arrivals).toEqual(SCHEDULE.arrivals);

        const pastedData = sa.getElementData<{ arrivalScheduleId: string }>(pasted)!;
        expect(pastedData.arrivalScheduleId).toBe(clone.id);

        // Original schedule record untouched.
        expect(schedules.find((s) => s.id === 'schedule-1')).toEqual(SCHEDULE);
        // Original generator block untouched.
        expect(sa.getElementData<{ arrivalScheduleId: string }>(original)!.arrivalScheduleId).toBe('schedule-1');

        expect(result.changed).toBe(true);
        expect(result.notices).toContain('Pasted generator uses a new copy of its arrival schedule');
    });

    it('cross-page: pattern and schedule resolve only on another page -> cloned INTO this page', () => {
        const sa = new StorageAdapter();
        const sourcePage = makeFakePage('page-source');
        const targetPage = makeFakePage('page-target');
        sa.setArrivalPatterns(sourcePage, [PATTERN]);
        sa.setArrivalSchedules(sourcePage, [SCHEDULE]);
        const pasted = addBlock(
            targetPage,
            makePastedGeneratorBlock(sa, 'block-new', 'block-orig', {
                name: 'Arrivals',
                entityId: 'entity-1',
                arrivalPatternId: 'pattern-1',
                arrivalScheduleId: 'schedule-1',
            })
        );

        const result = normalizePastedItems([pasted], sa, { allPages: () => [sourcePage, targetPage] });

        // Source page untouched.
        expect(sa.getArrivalPatterns(sourcePage)).toEqual([PATTERN]);
        expect(sa.getArrivalSchedules(sourcePage)).toEqual([SCHEDULE]);

        const targetPatterns = sa.getArrivalPatterns(targetPage);
        const targetSchedules = sa.getArrivalSchedules(targetPage);
        expect(targetPatterns).toHaveLength(1);
        expect(targetSchedules).toHaveLength(1);
        expect(targetPatterns[0].id).not.toBe('pattern-1');
        expect(targetPatterns[0].name).toBe('Weekday rush');
        expect(targetSchedules[0].id).not.toBe('schedule-1');
        expect(targetSchedules[0].name).toBe('Morning batch');

        const pastedData = sa.getElementData<{ arrivalPatternId: string; arrivalScheduleId: string }>(pasted)!;
        expect(pastedData.arrivalPatternId).toBe(targetPatterns[0].id);
        expect(pastedData.arrivalScheduleId).toBe(targetSchedules[0].id);

        expect(result.notices).toEqual(
            expect.arrayContaining([
                'Pasted generator uses a new copy of its arrival pattern',
                'Pasted generator uses a new copy of its arrival schedule',
            ])
        );
    });

    it('arrivalPatternId/arrivalScheduleId that resolve nowhere are dropped from the domain', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        sa.setArrivalPatterns(page, []);
        sa.setArrivalSchedules(page, []);
        const pasted = addBlock(
            page,
            makePastedGeneratorBlock(sa, 'block-new', 'block-orig', {
                name: 'Arrivals',
                entityId: 'entity-1',
                arrivalPatternId: 'pattern-gone',
                arrivalScheduleId: 'schedule-gone',
            })
        );

        const result = normalizePastedItems([pasted], sa, { allPages: () => [page] });

        const pastedData = sa.getElementData<{ arrivalPatternId?: string; arrivalScheduleId?: string }>(pasted)!;
        expect(pastedData.arrivalPatternId).toBeUndefined();
        expect(pastedData.arrivalScheduleId).toBeUndefined();
        expect(sa.getArrivalPatterns(page)).toEqual([]);
        expect(sa.getArrivalSchedules(page)).toEqual([]);
        expect(result.notices).not.toContain('Pasted generator uses a new copy of its arrival pattern');
        expect(result.notices).not.toContain('Pasted generator uses a new copy of its arrival schedule');
    });

    it('entityId is byte-identical: not repointed, not touched', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        const pasted = addBlock(
            page,
            makePastedGeneratorBlock(sa, 'block-new', 'block-orig', {
                name: 'Arrivals',
                entityId: 'entity-custom-42',
            })
        );

        normalizePastedItems([pasted], sa);

        expect(sa.getElementData<{ entityId: string }>(pasted)!.entityId).toBe('entity-custom-42');
    });

    it('name suffixed only when it collides with another Generator on this page, with a rename notice', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        addGeneratorBlock(sa, page, 'block-other', 'Arrivals');
        const pasted = addBlock(page, makePastedGeneratorBlock(sa, 'block-new', 'block-orig', { name: 'Arrivals', entityId: 'entity-1' }));

        const result = normalizePastedItems([pasted], sa);

        const data = sa.getElementData<{ name: string }>(pasted)!;
        expect(data.name).toBe('Arrivals_2');
        expect(result.notices).toContain(`Pasted generator renamed to 'Arrivals_2'`);
    });

    it('no collision -> name unchanged and no rename notice, but leverIds still re-mint (a paste ALWAYS re-mints)', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        addGeneratorBlock(sa, page, 'block-other', 'Registration');
        const pasted = addBlock(
            page,
            makePastedGeneratorBlock(sa, 'block-new', 'block-orig', {
                name: 'Arrivals',
                entityId: 'entity-1',
                levers: [{ leverId: 'lever-1', propertyName: 'interarrivalTime', enabled: true, label: 'Rate' }],
            })
        );

        const result = normalizePastedItems([pasted], sa);

        const data = sa.getElementData<{ name: string; levers: any[] }>(pasted)!;
        expect(data.name).toBe('Arrivals');
        expect(result.notices).not.toContain(`Pasted generator renamed to 'Arrivals'`);
        expect(data.levers).toHaveLength(1);
        expect(data.levers[0].leverId).not.toBe('lever-1');
        expect(data.levers[0].leverId).toBeTruthy();
        expect(data.levers[0].label).toBe('Rate');
        expect(result.changed).toBe(true);
    });

    it('is idempotent: a second pass writes nothing', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        sa.setArrivalPatterns(page, [PATTERN]);
        sa.setArrivalSchedules(page, [SCHEDULE]);
        addGeneratorBlock(sa, page, 'block-other', 'Arrivals');
        const pasted = addBlock(
            page,
            makePastedGeneratorBlock(sa, 'block-new', 'block-orig', {
                name: 'Arrivals',
                entityId: 'entity-1',
                arrivalPatternId: 'pattern-1',
                arrivalScheduleId: 'schedule-1',
                levers: [{ leverId: 'lever-1', propertyName: 'interarrivalTime', enabled: true, label: 'Rate' }],
            })
        );

        normalizePastedItems([pasted], sa);
        const qDataAfterFirst = pasted.shapeData.get('q_data');
        const patternsAfterFirst = page.shapeData.get('q_arrival_patterns');
        const schedulesAfterFirst = page.shapeData.get('q_arrival_schedules');

        const second = normalizePastedItems([pasted], sa);

        expect(second.changed).toBe(false);
        expect(second.notices).toEqual([]);
        expect(pasted.shapeData.get('q_data')).toBe(qDataAfterFirst);
        expect(page.shapeData.get('q_arrival_patterns')).toBe(patternsAfterFirst);
        expect(page.shapeData.get('q_arrival_schedules')).toBe(schedulesAfterFirst);
    });
});
