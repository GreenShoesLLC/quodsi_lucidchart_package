// tests/model/generatorLucid.arrivalPatternIdClear.test.ts
//
// Task 10 review round 3, Minor finding: switching a generator away from
// PATTERN mode calls accessor.updateShape(id, 'Generator', { mode,
// arrivalPatternId: undefined }), and that clear never reached storage.
// `arrivalPatternId: undefined` is invisible twice over -- the
// panel->extension JSON transport drops the key before the message is
// sent, and StorageAdapter.updateElementData strips undefined-valued keys
// before merging (deliberately -- a partial update must not clobber stored
// width/height). So the stored link survived a clear: the generator kept
// pointing at a pattern the model root had already deleted
// (removePatternForGenerator), a dangling reference.
//
// This mirrors activityLucid.queueRankingClear.test.ts's finding 1 exactly
// -- same shape of bug, same fix (an explicit CLEARED_FIELDS_KEY
// declaration, honoured only for the one key a Generator write-back may
// delete) -- see GeneratorLucid.ts's generatorStorageRemoveKeys and
// ModelManager.ts's handleDataUpdate for the implementation this pins.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { generatorStorageRemoveKeys } from '../../src/types/GeneratorLucid';
import { CLEARED_FIELDS_KEY, GeneratorType, SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakePage } from '../helpers/fakeProxies';

const LINKED_GENERATOR = {
    id: 'gen-1',
    name: 'Arrivals',
    mode: GeneratorType.PATTERN,
    arrivalPatternId: 'ap-1',
    volume: 1000,
};

/** What actually reaches the extension: JSON drops undefined-valued keys, so
 *  a cleared link arrives as a MISSING key, indistinguishable from silence. */
function overTheWire<T>(data: T): any {
    return JSON.parse(JSON.stringify(data));
}

function storedData(storage: StorageAdapter, element: any): any {
    return storage.getElementData<any>(element);
}

function newManager(storage: StorageAdapter): ModelManager {
    const manager = new ModelManager(storage);
    (manager as any).modelDefinition = { model: { id: 'page-1', name: 'M' } };
    (manager as any).registerElement = async () => undefined;
    return manager;
}

describe('generatorStorageRemoveKeys', () => {
    it('deletes only what was explicitly declared, and only arrivalPatternId', () => {
        // Silence is not a clear -- this is the whole fix.
        expect(generatorStorageRemoveKeys(undefined)).toEqual([]);
        expect(generatorStorageRemoveKeys([])).toEqual([]);
        // A declaration is honoured, but only for keys a Generator may clear.
        expect(generatorStorageRemoveKeys(['arrivalPatternId'])).toEqual(['arrivalPatternId']);
        expect(generatorStorageRemoveKeys(['volume', 'name'])).toEqual([]);
        expect(generatorStorageRemoveKeys(['volume', 'arrivalPatternId'])).toEqual(['arrivalPatternId']);
    });
});

describe('clearing a generator arrivalPatternId link persists (Task 10 review round 3, Minor)', () => {
    it('drops the stored link on the panel save path (ModelManager.saveElementData)', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('gen-1');
        storage.setElementData(block, LINKED_GENERATOR, SimulationObjectType.Generator);
        expect(storedData(storage, block).arrivalPatternId).toBe('ap-1');

        const manager = newManager(storage);

        // The switch-away-from-PATTERN handler declares the clear (mirrors
        // GeneratorEditor.tsx: declareClearedFields({ name, mode: 'frequency' },
        // ['arrivalPatternId'])) -- `name` is included on purpose: this
        // repo's fake BlockProxy is not `instanceof BlockProxy`, so
        // ModelManager.getDefaultElementName's shape-derived fallback would
        // otherwise stand in for a real block's on-canvas text label, which
        // this test harness has no equivalent of. The key itself is gone
        // (JSON dropped the undefined); what makes this a clear rather than
        // silence is the explicit declaration.
        const cleared = overTheWire({
            name: 'Arrivals',
            mode: GeneratorType.FREQUENCY,
            [CLEARED_FIELDS_KEY]: ['arrivalPatternId'],
        });
        expect('arrivalPatternId' in cleared).toBe(false);
        expect(cleared[CLEARED_FIELDS_KEY]).toEqual(['arrivalPatternId']);

        await manager.saveElementData(block, cleared, SimulationObjectType.Generator, page);

        const after = storedData(storage, block);
        expect('arrivalPatternId' in after).toBe(false);
        expect(after.mode).toBe(GeneratorType.FREQUENCY);
        // ...without collateral damage to the rest of the generator.
        expect(after.name).toBe('Arrivals');
        expect(after.volume).toBe(1000);
        // The declaration is ABOUT the payload, never part of it: it must not
        // reach shape data, from where it would be published in model JSON.
        expect(CLEARED_FIELDS_KEY in after).toBe(false);
    });

    it('still preserves a link the payload did not mention (no over-deletion)', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('gen-1');
        storage.setElementData(block, LINKED_GENERATOR, SimulationObjectType.Generator);

        const manager = newManager(storage);

        // The payload OMITS arrivalPatternId entirely -- the same shape any
        // partial Generator save (e.g. a plain name edit) has -- and says
        // nothing about clearing it. Silence is not a clear: the stored link
        // must survive untouched.
        const { arrivalPatternId, ...withoutLink } = LINKED_GENERATOR as any;
        const partial = overTheWire({ ...withoutLink, name: 'Renamed' });
        expect('arrivalPatternId' in partial).toBe(false);
        expect(CLEARED_FIELDS_KEY in partial).toBe(false);

        await manager.saveElementData(block, partial, SimulationObjectType.Generator, page);

        const after = storedData(storage, block);
        expect(after.arrivalPatternId).toBe('ap-1');
        expect(after.name).toBe('Renamed');
    });

    it('honours a declaration only for arrivalPatternId, not arbitrary keys', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('gen-1');
        storage.setElementData(block, LINKED_GENERATOR, SimulationObjectType.Generator);

        const manager = newManager(storage);

        const { volume, ...withoutVolume } = LINKED_GENERATOR as any;
        await manager.saveElementData(
            block,
            overTheWire({ ...withoutVolume, [CLEARED_FIELDS_KEY]: ['volume', 'name'] }),
            SimulationObjectType.Generator,
            page,
        );

        const after = storedData(storage, block);
        // volume/name are not in GENERATOR_CLEARABLE_KEYS -- the declaration
        // names them, but only arrivalPatternId is honoured.
        expect(after.volume).toBe(1000);
        expect(after.name).toBe('Arrivals');
        expect(CLEARED_FIELDS_KEY in after).toBe(false);
    });
});
