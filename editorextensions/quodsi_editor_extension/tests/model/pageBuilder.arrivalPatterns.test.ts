// tests/model/pageBuilder.arrivalPatterns.test.ts
//
// Task 5 (lucid-arrival-pattern-editor): ModelDefinitionPageBuilder must
// populate ModelDefinition.arrivalPatterns from the page-level
// q_arrival_patterns list Task 4 added to StorageAdapter, mirroring
// loadEntities/loadStates. Placed alongside the other
// ModelDefinitionPageBuilder-exercising tests (lucidVersionUpgrader.
// pageLevelLists.test.ts, storageAdapter.arrivalPatterns.test.ts) rather
// than under a new tests/core/ directory -- tests/core/ does not exist in
// this package, and tests/model/ already holds the page-level-list tests.
//
// Structured to follow lucidVersionUpgrader.pageLevelLists.test.ts's
// precedent: construct real StorageAdapter / LucidElementFactory /
// ModelDefinitionPageBuilder / Model / ModelDefinition instances (via
// makeFakePage for the page proxy) and reach the private loadArrivalPatterns
// through `(builder as any)`, rather than the brief's
// Object.create(...prototype) + require(...) approach -- a real instance
// built the normal way needs no prototype surgery, and storage is populated
// through the adapter's own public setArrivalPatterns rather than a
// hand-rolled fake storageAdapter object.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelDefinitionPageBuilder } from '../../src/core/ModelDefinitionPageBuilder';
import { LucidElementFactory } from '../../src/services/LucidElementFactory';
import { ModelDefinition, Model, SimulationTimeType, PeriodUnit, ArrivalPattern, SeasonMode } from '@quodsi/lucid-shared';
import { makeFakePage } from '../helpers/fakeProxies';

function makeBuilder(): { builder: ModelDefinitionPageBuilder; storageAdapter: StorageAdapter } {
    const storageAdapter = new StorageAdapter();
    const elementFactory = new LucidElementFactory(storageAdapter);
    const builder = new ModelDefinitionPageBuilder(storageAdapter, elementFactory);
    return { builder, storageAdapter };
}

function makeModelDefinition(): ModelDefinition {
    const model = new Model('doc-1', 'M', 1, 12345, PeriodUnit.MINUTES, SimulationTimeType.Clock);
    return new ModelDefinition(model);
}

describe('ModelDefinitionPageBuilder.loadArrivalPatterns', () => {
    it('adds each stored pattern to the model definition', () => {
        const { builder, storageAdapter } = makeBuilder();
        const page = makeFakePage('page-1');
        storageAdapter.setArrivalPatterns(page, [
            { id: 'ap-1', name: 'P1', seasonWeights: [1, 2, 3], cycle: 'year' } as any,
            { id: 'ap-2', name: 'P2' } as any,
        ]);
        const modelDefinition = makeModelDefinition();

        (builder as any).loadArrivalPatterns(page, modelDefinition);

        expect(modelDefinition.arrivalPatterns.size()).toBe(2);
        const first = modelDefinition.arrivalPatterns.get('ap-1');
        expect(first?.name).toBe('P1');
        expect(first?.seasonWeights).toEqual([1, 2, 3]);
        const second = modelDefinition.arrivalPatterns.get('ap-2');
        expect(second?.name).toBe('P2');
    });

    it('leaves fields absent from storage at the ArrivalPattern constructor defaults', () => {
        const { builder, storageAdapter } = makeBuilder();
        const page = makeFakePage('page-1');
        storageAdapter.setArrivalPatterns(page, [{ id: 'ap-1', name: 'P1' } as any]);
        const modelDefinition = makeModelDefinition();

        (builder as any).loadArrivalPatterns(page, modelDefinition);

        const loaded = modelDefinition.arrivalPatterns.get('ap-1');
        expect(loaded?.seasonWeights).toEqual([]);
        expect(loaded?.dayOfWeekWeights).toEqual([]);
        expect(loaded?.hourWeights).toEqual([]);
    });

    it('round-trips a WEEK-mode pattern without flipping it back to MONTH (wire-default omit rule)', () => {
        // ArrivalPattern's class scaffold default is MONTH, but toJSON()
        // omits `seasonMode` when it equals the WIRE default, WEEK -- so a
        // saved WEEK pattern serializes with no `seasonMode` key at all.
        // The loader must resolve that absence back to WEEK, not to the
        // freshly-constructed MONTH. Goes through the real ArrivalPattern
        // instance's own toJSON() and the real setArrivalPatterns/
        // getArrivalPatterns round trip, not a hand-built fixture, so the
        // omission is the genuine one toJSON() produces.
        const { builder, storageAdapter } = makeBuilder();
        const page = makeFakePage('page-1');

        const authored = new ArrivalPattern('ap-1', 'P1');
        authored.seasonMode = SeasonMode.WEEK;
        authored.seasonWeights = Array.from({ length: 52 }, (_, i) => i + 1);
        const serialized = authored.toJSON() as any;
        expect('seasonMode' in serialized).toBe(false); // sanity: confirms the omission this test guards against

        storageAdapter.setArrivalPatterns(page, [serialized]);
        const modelDefinition = makeModelDefinition();

        (builder as any).loadArrivalPatterns(page, modelDefinition);

        const loaded = modelDefinition.arrivalPatterns.get('ap-1');
        expect(loaded?.seasonMode).toBe(SeasonMode.WEEK);
        expect(loaded?.seasonWeights).toHaveLength(52);
    });

    it('leaves the list empty when nothing is stored', () => {
        const { builder } = makeBuilder();
        const page = makeFakePage('page-1');
        const modelDefinition = makeModelDefinition();

        (builder as any).loadArrivalPatterns(page, modelDefinition);

        expect(modelDefinition.arrivalPatterns.size()).toBe(0);
    });

    it('skips a corrupt entry without aborting the rest of the load', () => {
        const { builder, storageAdapter } = makeBuilder();
        const page = makeFakePage('page-1');
        storageAdapter.setArrivalPatterns(page, [
            { id: 'ap-1', name: 'P1' } as any,
            // Missing id -- ArrivalPattern's own field defaults don't reject
            // this, so simulate a genuinely bad entry via a null id instead,
            // matching what a corrupted/foreign JSON blob could contain.
            null as any,
            { id: 'ap-2', name: 'P2' } as any,
        ]);
        const modelDefinition = makeModelDefinition();

        expect(() => {
            (builder as any).loadArrivalPatterns(page, modelDefinition);
        }).not.toThrow();

        expect(modelDefinition.arrivalPatterns.size()).toBe(2);
        expect(modelDefinition.arrivalPatterns.get('ap-1')?.name).toBe('P1');
        expect(modelDefinition.arrivalPatterns.get('ap-2')?.name).toBe('P2');
    });
});
