// tests/model/modelManager.removeElement.arrivalPatternCleanup.test.ts
//
// Final fix wave (item 4): removePatternForGenerator's "generator deleted"
// lifecycle-table row (quodsi_studio's platforms/shared/panels/
// arrivalPatternLifecycle.ts) was never wired into any host delete path --
// only the mode-switch handler in GeneratorEditor.tsx called it. Deleting a
// PATTERN generator on the canvas left its ArrivalPattern in q_arrival_patterns
// forever. These tests exercise ModelManager.removeElement() end-to-end
// against a real ModelDefinition + StorageAdapter, proving the orphan is gone
// after deletion, and that the sharing invariant (spare a pattern still
// referenced by another generator) survives.

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
import { makeFakeBlock, makeFakePage } from '../helpers/fakeProxies';

/**
 * Wires a real ModelDefinition directly into a fresh ModelManager, bypassing
 * the page->storage->builder round trip (irrelevant to this fix): sets
 * `currentPage` and `modelDefinition` and marks the model-definition cache
 * clean, so `ensureModelDefinition()` (called internally by removeElement)
 * returns this object as-is instead of rebuilding from (empty) fake-page
 * storage.
 */
function wireModelDefinition(manager: ModelManager, page: any, modelDefinition: ModelDefinition): void {
    (manager as any).currentPage = page;
    (manager as any).modelDefinition = modelDefinition;
    // removeElement's trailing validateModelIfNeeded() always calls
    // validateModel(), which unconditionally forces a rebuild via
    // ensureModelDefinition() -- against fake-page storage that has none of
    // the raw shape data ModelDefinitionPageBuilder needs, so a REAL rebuild
    // throws ("Builder returned null ModelDefinition"). Stubbing the private
    // ensureModelDefinition() to return our hand-built ModelDefinition
    // mirrors this suite's existing pattern of stubbing private
    // bookkeeping methods that are not under test (see
    // modelManager.handleDataUpdate.namePreservation.test.ts's `newManager`
    // stubbing `registerElement`).
    (manager as any).ensureModelDefinition = async () => modelDefinition;
}

describe('ModelManager.removeElement - ArrivalPattern cleanup on generator deletion', () => {
    it('removes the pattern when the sole generator referencing it is deleted', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const block = makeFakeBlock('gen-1');
        page.allBlocks.set(block.id, block);

        const modelDef = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        const generator = new Generator('gen-1', 'Gen1', 'entity-default');
        generator.mode = GeneratorType.PATTERN;
        generator.arrivalPatternId = 'pattern-1';
        modelDef.generators.add(generator);

        const pattern = new ArrivalPattern('pattern-1', 'Gen1 pattern');
        modelDef.arrivalPatterns.add(pattern);

        // Seed storage with the pattern too, so we can observe it disappear
        // from the SAME persistence surface a real deploy reads back from.
        storage.setArrivalPatterns(page, [pattern.toJSON() as ISerializedArrivalPattern]);

        const manager = new ModelManager(storage);
        wireModelDefinition(manager, page, modelDef);

        await manager.removeElement('gen-1');

        expect(modelDef.arrivalPatterns.get('pattern-1')).toBeUndefined();
        expect(storage.getArrivalPatterns(page)).toEqual([]);
    });

    it('spares the pattern when another generator still references it', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const blockA = makeFakeBlock('gen-a');
        const blockB = makeFakeBlock('gen-b');
        page.allBlocks.set(blockA.id, blockA);
        page.allBlocks.set(blockB.id, blockB);

        const modelDef = new ModelDefinition(new Model('model-1', 'Test Model', 1));

        const generatorA = new Generator('gen-a', 'GenA', 'entity-default');
        generatorA.mode = GeneratorType.PATTERN;
        generatorA.arrivalPatternId = 'pattern-shared';
        modelDef.generators.add(generatorA);

        const generatorB = new Generator('gen-b', 'GenB', 'entity-default');
        generatorB.mode = GeneratorType.PATTERN;
        generatorB.arrivalPatternId = 'pattern-shared';
        modelDef.generators.add(generatorB);

        const pattern = new ArrivalPattern('pattern-shared', 'Shared pattern');
        modelDef.arrivalPatterns.add(pattern);
        storage.setArrivalPatterns(page, [pattern.toJSON() as ISerializedArrivalPattern]);

        const manager = new ModelManager(storage);
        wireModelDefinition(manager, page, modelDef);

        await manager.removeElement('gen-a');

        // The pattern survives -- gen-b still references it.
        expect(modelDef.arrivalPatterns.get('pattern-shared')).toBeDefined();
        expect(storage.getArrivalPatterns(page)).toEqual([pattern.toJSON()]);
        // And gen-a itself is gone, same as any other deletion.
        expect(modelDef.generators.get('gen-a')).toBeUndefined();
    });
});
