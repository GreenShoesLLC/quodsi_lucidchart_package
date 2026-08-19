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
    GeneratorType,
    ISerializedArrivalPattern,
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
