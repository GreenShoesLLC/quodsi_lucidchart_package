// tests/model/modelManager.generatorDeletionCleanup.test.ts
//
// Task 5 (2026-08-19 lucid-pattern-modal-and-lag plan): the previous fix
// wired ArrivalPattern cleanup into ModelManager.removeElement(), which has
// exactly two callers -- saveElementData's un-convert path and
// LucidPageConversionService's re-conversion path. Native canvas deletion
// reaches neither: deletions are discovered by the rebuild diff in
// detectAndCleanupDeletedElements(), which had branches for Activities,
// Entities and Resources but none for Generators. removeElement also
// early-returns when findElementProxy() returns null, which is exactly the
// post-deletion state -- so it could not have worked there even if wired in.
//
// These tests drive the fourth branch directly through
// detectAndCleanupDeletedElements(oldModel, newModel, page), the same
// private method the real rebuild path calls (see ensureModelDefinition's
// `await this.detectAndCleanupDeletedElements(this.modelDefinition,
// newModelDefinition, this.currentPage)`), mirroring the structure of
// modelManager.removeElement.arrivalPatternCleanup.test.ts.

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
import { makeFakePage } from '../helpers/fakeProxies';

describe('ModelManager.detectAndCleanupDeletedElements - Generator deletion (arrival pattern cleanup)', () => {
    it('removes the pattern when the sole PATTERN generator referencing it is deleted', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const oldModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const generator = new Generator('gen-1', 'Gen1', 'entity-default');
        generator.mode = GeneratorType.PATTERN;
        generator.arrivalPatternId = 'pattern-1';
        oldModel.generators.add(generator);

        const pattern = new ArrivalPattern('pattern-1', 'Gen1 pattern');
        oldModel.arrivalPatterns.add(pattern);

        // The new model is what a rebuild produces after the generator shape
        // is deleted from the canvas: the generator is gone, but
        // arrivalPatterns is loaded independently from page storage (see
        // ModelDefinitionPageBuilder), so the orphan is still present until
        // the cleanup branch under test removes it.
        const newModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const newPattern = new ArrivalPattern('pattern-1', 'Gen1 pattern');
        newModel.arrivalPatterns.add(newPattern);

        storage.setArrivalPatterns(page, [pattern.toJSON() as ISerializedArrivalPattern]);

        const manager = new ModelManager(storage);
        await (manager as any).detectAndCleanupDeletedElements(oldModel, newModel, page);

        expect(newModel.arrivalPatterns.get('pattern-1')).toBeUndefined();
        expect(storage.getArrivalPatterns(page)).toEqual([]);
    });

    it('spares the pattern when another generator in the new model still references it', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const oldModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const generatorA = new Generator('gen-a', 'GenA', 'entity-default');
        generatorA.mode = GeneratorType.PATTERN;
        generatorA.arrivalPatternId = 'pattern-shared';
        oldModel.generators.add(generatorA);

        const generatorB = new Generator('gen-b', 'GenB', 'entity-default');
        generatorB.mode = GeneratorType.PATTERN;
        generatorB.arrivalPatternId = 'pattern-shared';
        oldModel.generators.add(generatorB);

        const pattern = new ArrivalPattern('pattern-shared', 'Shared pattern');
        oldModel.arrivalPatterns.add(pattern);

        // New model: gen-a was deleted on canvas, gen-b survives and still
        // references the shared pattern.
        const newModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const newGeneratorB = new Generator('gen-b', 'GenB', 'entity-default');
        newGeneratorB.mode = GeneratorType.PATTERN;
        newGeneratorB.arrivalPatternId = 'pattern-shared';
        newModel.generators.add(newGeneratorB);
        const newPattern = new ArrivalPattern('pattern-shared', 'Shared pattern');
        newModel.arrivalPatterns.add(newPattern);

        storage.setArrivalPatterns(page, [pattern.toJSON() as ISerializedArrivalPattern]);

        const manager = new ModelManager(storage);
        await (manager as any).detectAndCleanupDeletedElements(oldModel, newModel, page);

        // The pattern survives -- gen-b still references it.
        expect(newModel.arrivalPatterns.get('pattern-shared')).toBeDefined();
        expect(storage.getArrivalPatterns(page)).toEqual([pattern.toJSON()]);
    });

    it('leaves arrival patterns untouched when a FREQUENCY generator is deleted', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const oldModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const generator = new Generator('gen-freq', 'GenFreq', 'entity-default');
        generator.mode = GeneratorType.FREQUENCY;
        // FREQUENCY generators carry no arrivalPatternId.
        oldModel.generators.add(generator);

        // An unrelated PATTERN generator + pattern stay present in both old
        // and new models, to prove the branch doesn't touch anything it
        // shouldn't when the deleted generator itself had no pattern.
        const unrelatedGenerator = new Generator('gen-other', 'GenOther', 'entity-default');
        unrelatedGenerator.mode = GeneratorType.PATTERN;
        unrelatedGenerator.arrivalPatternId = 'pattern-untouched';
        oldModel.generators.add(unrelatedGenerator);
        const unrelatedPattern = new ArrivalPattern('pattern-untouched', 'Untouched pattern');
        oldModel.arrivalPatterns.add(unrelatedPattern);

        const newModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const newUnrelatedGenerator = new Generator('gen-other', 'GenOther', 'entity-default');
        newUnrelatedGenerator.mode = GeneratorType.PATTERN;
        newUnrelatedGenerator.arrivalPatternId = 'pattern-untouched';
        newModel.generators.add(newUnrelatedGenerator);
        const newUnrelatedPattern = new ArrivalPattern('pattern-untouched', 'Untouched pattern');
        newModel.arrivalPatterns.add(newUnrelatedPattern);
        // gen-freq is absent from newModel: it was deleted.

        storage.setArrivalPatterns(page, [unrelatedPattern.toJSON() as ISerializedArrivalPattern]);

        const manager = new ModelManager(storage);
        await (manager as any).detectAndCleanupDeletedElements(oldModel, newModel, page);

        expect(newModel.arrivalPatterns.get('pattern-untouched')).toBeDefined();
        expect(storage.getArrivalPatterns(page)).toEqual([unrelatedPattern.toJSON()]);
    });
});

// Task 4 (2026-08-19 lucid-arrival-schedules-persistence spec): a fifth
// branch, mirroring the arrival-pattern branch above exactly (diff
// oldModel.generators against newModel.generators; for each generator
// present in old and absent in new carrying an arrivalScheduleId, remove
// that schedule unless another generator in newModel still references it).
// Same rebuild-diff path, same reasoning: native canvas deletion never
// reaches removeElement().
describe('ModelManager.detectAndCleanupDeletedElements - Generator deletion (arrival schedule cleanup)', () => {
    it('removes the schedule when the sole SCHEDULED generator referencing it is deleted', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const oldModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const generator = new Generator('gen-1', 'Gen1', 'entity-default');
        generator.mode = GeneratorType.SCHEDULED;
        generator.arrivalScheduleId = 'sched-1';
        oldModel.generators.add(generator);

        const schedule = new ArrivalSchedule('sched-1', 'Gen1 schedule');
        oldModel.arrivalSchedules.add(schedule);

        // The new model is what a rebuild produces after the generator shape
        // is deleted from the canvas: the generator is gone, but
        // arrivalSchedules is loaded independently from page storage (see
        // ModelDefinitionPageBuilder), so the orphan is still present until
        // the cleanup branch under test removes it.
        const newModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const newSchedule = new ArrivalSchedule('sched-1', 'Gen1 schedule');
        newModel.arrivalSchedules.add(newSchedule);

        storage.setArrivalSchedules(page, [schedule.toJSON() as ISerializedArrivalSchedule]);

        const manager = new ModelManager(storage);
        await (manager as any).detectAndCleanupDeletedElements(oldModel, newModel, page);

        expect(newModel.arrivalSchedules.get('sched-1')).toBeUndefined();
        expect(storage.getArrivalSchedules(page)).toEqual([]);
    });

    it('spares the schedule when another generator in the new model still references it', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const oldModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const generatorA = new Generator('gen-a', 'GenA', 'entity-default');
        generatorA.mode = GeneratorType.SCHEDULED;
        generatorA.arrivalScheduleId = 'sched-shared';
        oldModel.generators.add(generatorA);

        const generatorB = new Generator('gen-b', 'GenB', 'entity-default');
        generatorB.mode = GeneratorType.SCHEDULED;
        generatorB.arrivalScheduleId = 'sched-shared';
        oldModel.generators.add(generatorB);

        const schedule = new ArrivalSchedule('sched-shared', 'Shared schedule');
        oldModel.arrivalSchedules.add(schedule);

        // New model: gen-a was deleted on canvas, gen-b survives and still
        // references the shared schedule.
        const newModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const newGeneratorB = new Generator('gen-b', 'GenB', 'entity-default');
        newGeneratorB.mode = GeneratorType.SCHEDULED;
        newGeneratorB.arrivalScheduleId = 'sched-shared';
        newModel.generators.add(newGeneratorB);
        const newSchedule = new ArrivalSchedule('sched-shared', 'Shared schedule');
        newModel.arrivalSchedules.add(newSchedule);

        storage.setArrivalSchedules(page, [schedule.toJSON() as ISerializedArrivalSchedule]);

        const manager = new ModelManager(storage);
        await (manager as any).detectAndCleanupDeletedElements(oldModel, newModel, page);

        // The schedule survives -- gen-b still references it. Checked
        // against newModel (the survivors), not oldModel, which would
        // still show the deleted generator referencing its own schedule.
        expect(newModel.arrivalSchedules.get('sched-shared')).toBeDefined();
        expect(storage.getArrivalSchedules(page)).toEqual([schedule.toJSON()]);
    });

    it('leaves arrival schedules untouched when a FREQUENCY generator is deleted', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const oldModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const generator = new Generator('gen-freq', 'GenFreq', 'entity-default');
        generator.mode = GeneratorType.FREQUENCY;
        // FREQUENCY generators carry no arrivalScheduleId.
        oldModel.generators.add(generator);

        // An unrelated SCHEDULED generator + schedule stay present in both
        // old and new models, to prove the branch doesn't touch anything it
        // shouldn't when the deleted generator itself had no schedule.
        const unrelatedGenerator = new Generator('gen-other', 'GenOther', 'entity-default');
        unrelatedGenerator.mode = GeneratorType.SCHEDULED;
        unrelatedGenerator.arrivalScheduleId = 'sched-untouched';
        oldModel.generators.add(unrelatedGenerator);
        const unrelatedSchedule = new ArrivalSchedule('sched-untouched', 'Untouched schedule');
        oldModel.arrivalSchedules.add(unrelatedSchedule);

        const newModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const newUnrelatedGenerator = new Generator('gen-other', 'GenOther', 'entity-default');
        newUnrelatedGenerator.mode = GeneratorType.SCHEDULED;
        newUnrelatedGenerator.arrivalScheduleId = 'sched-untouched';
        newModel.generators.add(newUnrelatedGenerator);
        const newUnrelatedSchedule = new ArrivalSchedule('sched-untouched', 'Untouched schedule');
        newModel.arrivalSchedules.add(newUnrelatedSchedule);
        // gen-freq is absent from newModel: it was deleted.

        storage.setArrivalSchedules(page, [unrelatedSchedule.toJSON() as ISerializedArrivalSchedule]);

        const manager = new ModelManager(storage);
        await (manager as any).detectAndCleanupDeletedElements(oldModel, newModel, page);

        expect(newModel.arrivalSchedules.get('sched-untouched')).toBeDefined();
        expect(storage.getArrivalSchedules(page)).toEqual([unrelatedSchedule.toJSON()]);
    });

    it('removes both an orphaned pattern and an orphaned schedule when a generator carrying both stale ids is deleted', async () => {
        // Genuinely reachable state (review finding): Lucid storage strips
        // `undefined`, not stale-but-defined values, so a generator that
        // switched modes can end up carrying both arrivalPatternId and
        // arrivalScheduleId at once. Both branches in
        // detectAndCleanupDeletedElements are independent and must each
        // fire for the same deleted generator.
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const oldModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const generator = new Generator('gen-both', 'GenBoth', 'entity-default');
        generator.mode = GeneratorType.SCHEDULED;
        generator.arrivalPatternId = 'pattern-stale';
        generator.arrivalScheduleId = 'sched-current';
        oldModel.generators.add(generator);

        const pattern = new ArrivalPattern('pattern-stale', 'Stale pattern');
        oldModel.arrivalPatterns.add(pattern);
        const schedule = new ArrivalSchedule('sched-current', 'Current schedule');
        oldModel.arrivalSchedules.add(schedule);

        // New model: gen-both was deleted on canvas; both lists are still
        // loaded independently from page storage until cleanup runs.
        const newModel = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        newModel.arrivalPatterns.add(new ArrivalPattern('pattern-stale', 'Stale pattern'));
        newModel.arrivalSchedules.add(new ArrivalSchedule('sched-current', 'Current schedule'));

        storage.setArrivalPatterns(page, [pattern.toJSON() as ISerializedArrivalPattern]);
        storage.setArrivalSchedules(page, [schedule.toJSON() as ISerializedArrivalSchedule]);

        const manager = new ModelManager(storage);
        await (manager as any).detectAndCleanupDeletedElements(oldModel, newModel, page);

        expect(newModel.arrivalPatterns.get('pattern-stale')).toBeUndefined();
        expect(storage.getArrivalPatterns(page)).toEqual([]);
        expect(newModel.arrivalSchedules.get('sched-current')).toBeUndefined();
        expect(storage.getArrivalSchedules(page)).toEqual([]);
    });
});
