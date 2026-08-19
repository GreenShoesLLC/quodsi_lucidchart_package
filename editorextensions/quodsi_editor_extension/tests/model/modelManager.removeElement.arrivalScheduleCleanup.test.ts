// tests/model/modelManager.removeElement.arrivalScheduleCleanup.test.ts
//
// Task 4 review fix (2026-08-19 lucid-arrival-schedules-persistence spec):
// removeElement() carried an ArrivalPattern cleanup block (see
// modelManager.removeElement.arrivalPatternCleanup.test.ts) but no schedule
// equivalent. Its two callers (saveElementData's un-convert path,
// LucidPageConversionService's re-conversion path) run with a live element
// proxy -- so un-converting or re-converting a SCHEDULED generator left its
// ArrivalSchedule in q_arrival_schedules forever. The rebuild-diff branch in
// detectAndCleanupDeletedElements cannot recover it: removeElement mutates
// modelDef.generators in place BEFORE the next rebuild, so oldModel no
// longer carries the deleted generator's arrivalScheduleId by the time the
// diff runs. These tests exercise ModelManager.removeElement() end-to-end
// against a real ModelDefinition + StorageAdapter, mirroring the pattern
// suite's structure exactly.

import {
    ModelDefinition,
    Model,
    Generator,
    ArrivalPattern,
    ArrivalSchedule,
    GeneratorType,
    ISerializedArrivalPattern,
    ISerializedArrivalSchedule,
} from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { makeFakeBlock, makeFakePage } from '../helpers/fakeProxies';

/** See modelManager.removeElement.arrivalPatternCleanup.test.ts for why this
 *  stubbing is needed (fake-page storage has no raw shape data for a real
 *  rebuild). */
function wireModelDefinition(manager: ModelManager, page: any, modelDefinition: ModelDefinition): void {
    (manager as any).currentPage = page;
    (manager as any).modelDefinition = modelDefinition;
    (manager as any).ensureModelDefinition = async () => modelDefinition;
}

describe('ModelManager.removeElement - ArrivalSchedule cleanup on generator deletion', () => {
    it('removes the schedule when the sole generator referencing it is deleted', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const block = makeFakeBlock('gen-1');
        page.allBlocks.set(block.id, block);

        const modelDef = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const generator = new Generator('gen-1', 'Gen1', 'entity-default');
        generator.mode = GeneratorType.SCHEDULED;
        generator.arrivalScheduleId = 'sched-1';
        modelDef.generators.add(generator);

        const schedule = new ArrivalSchedule('sched-1', 'Gen1 schedule');
        modelDef.arrivalSchedules.add(schedule);

        // Seed storage with the schedule too, so we can observe it disappear
        // from the SAME persistence surface a real deploy reads back from.
        storage.setArrivalSchedules(page, [schedule.toJSON() as ISerializedArrivalSchedule]);

        const manager = new ModelManager(storage);
        wireModelDefinition(manager, page, modelDef);

        await manager.removeElement('gen-1');

        expect(modelDef.arrivalSchedules.get('sched-1')).toBeUndefined();
        expect(storage.getArrivalSchedules(page)).toEqual([]);
    });

    it('spares the schedule when another generator still references it', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const blockA = makeFakeBlock('gen-a');
        const blockB = makeFakeBlock('gen-b');
        page.allBlocks.set(blockA.id, blockA);
        page.allBlocks.set(blockB.id, blockB);

        const modelDef = new ModelDefinition(new Model('model-1', 'Test Model', 1));

        const generatorA = new Generator('gen-a', 'GenA', 'entity-default');
        generatorA.mode = GeneratorType.SCHEDULED;
        generatorA.arrivalScheduleId = 'sched-shared';
        modelDef.generators.add(generatorA);

        const generatorB = new Generator('gen-b', 'GenB', 'entity-default');
        generatorB.mode = GeneratorType.SCHEDULED;
        generatorB.arrivalScheduleId = 'sched-shared';
        modelDef.generators.add(generatorB);

        const schedule = new ArrivalSchedule('sched-shared', 'Shared schedule');
        modelDef.arrivalSchedules.add(schedule);
        storage.setArrivalSchedules(page, [schedule.toJSON() as ISerializedArrivalSchedule]);

        const manager = new ModelManager(storage);
        wireModelDefinition(manager, page, modelDef);

        await manager.removeElement('gen-a');

        // The schedule survives -- gen-b still references it.
        expect(modelDef.arrivalSchedules.get('sched-shared')).toBeDefined();
        expect(storage.getArrivalSchedules(page)).toEqual([schedule.toJSON()]);
        // And gen-a itself is gone, same as any other deletion.
        expect(modelDef.generators.get('gen-a')).toBeUndefined();
    });

    it('removes both the pattern and the schedule when a generator carrying both stale ids is deleted', async () => {
        // Genuinely reachable state (review finding): Lucid storage strips
        // `undefined`, not stale-but-defined values, so a generator that
        // switched modes (e.g. SCHEDULED -> PATTERN -> SCHEDULED) can end up
        // carrying both arrivalPatternId and arrivalScheduleId at once. Both
        // cleanup blocks are independent and must each fire.
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const block = makeFakeBlock('gen-both');
        page.allBlocks.set(block.id, block);

        const modelDef = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const generator = new Generator('gen-both', 'GenBoth', 'entity-default');
        generator.mode = GeneratorType.SCHEDULED;
        generator.arrivalPatternId = 'pattern-stale';
        generator.arrivalScheduleId = 'sched-current';
        modelDef.generators.add(generator);

        const pattern = new ArrivalPattern('pattern-stale', 'Stale pattern');
        modelDef.arrivalPatterns.add(pattern);
        const schedule = new ArrivalSchedule('sched-current', 'Current schedule');
        modelDef.arrivalSchedules.add(schedule);

        storage.setArrivalPatterns(page, [pattern.toJSON() as ISerializedArrivalPattern]);
        storage.setArrivalSchedules(page, [schedule.toJSON() as ISerializedArrivalSchedule]);

        const manager = new ModelManager(storage);
        wireModelDefinition(manager, page, modelDef);

        await manager.removeElement('gen-both');

        expect(modelDef.arrivalPatterns.get('pattern-stale')).toBeUndefined();
        expect(storage.getArrivalPatterns(page)).toEqual([]);
        expect(modelDef.arrivalSchedules.get('sched-current')).toBeUndefined();
        expect(storage.getArrivalSchedules(page)).toEqual([]);
    });
});
