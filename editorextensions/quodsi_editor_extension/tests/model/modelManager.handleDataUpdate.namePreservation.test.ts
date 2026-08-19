// tests/model/modelManager.handleDataUpdate.namePreservation.test.ts
//
// Task 10b: a partial patch that omits `name` was resetting the stored name
// to the canvas label (ModelManager.handleDataUpdate's old `else` branch --
// "no `name` key in the patch" was treated as "reset to elementName" instead
// of "leave the stored name unchanged"). GeneratorPatternTab's volume slider
// sends `{ volume }` with no `name`, so dragging it renamed the generator to
// its on-canvas label, silently reverting any panel rename (a panel rename
// never writes back to the canvas textAreas, so panel name and canvas label
// diverge permanently the first time a user renames anything). Beyond
// cosmetics, `name` feeds name-uniqueness validation and the published model
// JSON, so two shapes sharing a canvas label became two identically-named
// generators.
//
// The fix (ModelManager.ts, handleDataUpdate, ~line 2165): resolve the name
// to persist as
//   - the patch's explicit `name` if the patch declares the key (a falsy
//     value, e.g. '', still falls back to the canvas label -- unchanged
//     pre-existing behaviour), else
//   - the name already in storage, if any (an omitted key in a partial patch
//     means "unchanged"), else
//   - the canvas label (first save / element creation has no prior stored
//     name to fall back to).
//
// This repo's fake BlockProxy (tests/helpers/fakeProxies.ts) is not
// `instanceof BlockProxy`, so ModelManager.getDefaultElementName always
// falls through to its non-block branch and returns the fixed string
// 'Unnamed Connector' regardless of element type -- that string stands in
// for "the canvas label" throughout this file.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { GeneratorType, SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakePage } from '../helpers/fakeProxies';

const CANVAS_LABEL = 'Unnamed Connector'; // ModelManager.getDefaultElementName's non-BlockProxy fallback

const LINKED_GENERATOR = {
    id: 'gen-1',
    name: 'Arrivals',
    mode: GeneratorType.FREQUENCY,
    volume: 1000,
};

/** What actually reaches the extension: JSON drops undefined-valued keys. */
function overTheWire<T>(data: T): any {
    return JSON.parse(JSON.stringify(data));
}

function storedData(storage: StorageAdapter, element: any): any {
    return storage.getElementData<any>(element);
}

// Mirrors generatorLucid.arrivalPatternIdClear.test.ts's newManager: stub out
// registerElement (its in-memory ModelDefinition bookkeeping is not under
// test here) and modelDefinition (handleDataUpdate's "no existing model"
// branch would otherwise fire and call initializeModel).
function newManager(storage: StorageAdapter): ModelManager {
    const manager = new ModelManager(storage);
    (manager as any).modelDefinition = { model: { id: 'page-1', name: 'M' } };
    (manager as any).registerElement = async () => undefined;
    return manager;
}

describe('handleDataUpdate name resolution (Task 10b)', () => {
    it('preserves the previously stored name when a partial patch omits `name`', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('gen-1');
        storage.setElementData(block, LINKED_GENERATOR, SimulationObjectType.Generator);
        expect(storedData(storage, block).name).toBe('Arrivals');

        const manager = newManager(storage);

        // GeneratorPatternTab's volume slider: { volume } only, no `name`.
        const volumeOnly = overTheWire({ volume: 2500 });
        expect('name' in volumeOnly).toBe(false);

        await manager.saveElementData(block, volumeOnly, SimulationObjectType.Generator, page);

        const after = storedData(storage, block);
        expect(after.name).toBe('Arrivals'); // NOT reset to the canvas label
        expect(after.volume).toBe(2500);
    });

    it('still updates the name when the patch explicitly sets it', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('gen-1');
        storage.setElementData(block, LINKED_GENERATOR, SimulationObjectType.Generator);

        const manager = newManager(storage);

        await manager.saveElementData(
            block,
            overTheWire({ name: 'Renamed by user' }),
            SimulationObjectType.Generator,
            page
        );

        const after = storedData(storage, block);
        expect(after.name).toBe('Renamed by user');
    });

    it('falls back to the canvas label when the patch explicitly sets name to \'\' (unchanged legacy behaviour)', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('gen-1');
        storage.setElementData(block, LINKED_GENERATOR, SimulationObjectType.Generator);

        const manager = newManager(storage);

        await manager.saveElementData(
            block,
            overTheWire({ name: '' }),
            SimulationObjectType.Generator,
            page
        );

        const after = storedData(storage, block);
        // An explicit falsy name still falls back to the canvas label, not to
        // the previously stored name -- this is today's `|| elementName`
        // behaviour and is deliberately NOT changed by this fix.
        expect(after.name).toBe(CANVAS_LABEL);
    });

    it('defaults to the canvas label on first save / element creation, even with no `name` in the patch', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('gen-1');
        // No prior storage.setElementData call: this element has never been saved.
        expect(storedData(storage, block)).toBeNull();

        const manager = newManager(storage);

        await manager.saveElementData(
            block,
            overTheWire({ volume: 1000, mode: GeneratorType.FREQUENCY }),
            SimulationObjectType.Generator,
            page
        );

        const after = storedData(storage, block);
        expect(after.name).toBe(CANVAS_LABEL);
        expect(after.volume).toBe(1000);
    });
});
