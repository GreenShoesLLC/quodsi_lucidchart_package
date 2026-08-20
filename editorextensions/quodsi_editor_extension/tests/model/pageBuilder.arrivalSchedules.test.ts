// tests/model/pageBuilder.arrivalSchedules.test.ts
//
// Task 2 (lucid-arrival-schedules-persistence): ModelDefinitionPageBuilder
// must populate ModelDefinition.arrivalSchedules from the page-level
// q_arrival_schedules list this task added to StorageAdapter, mirroring
// loadArrivalPatterns / pageBuilder.arrivalPatterns.test.ts. Same
// construction approach as that file: real StorageAdapter /
// LucidElementFactory / ModelDefinitionPageBuilder / Model / ModelDefinition
// instances (via makeFakePage for the page proxy), reaching the private
// loadArrivalSchedules through `(builder as any)`.
//
// Unlike ArrivalPattern's seasonMode, ArrivalSchedule has no class-default /
// wire-omit-rule divergence: timeUnit's class default and toJSON() omit
// value are both PeriodUnit.MINUTES, and arrivals' default/omit value are
// both []. So an absent field genuinely means "leave at the constructor
// default" here -- no wire-default override is needed in the loader.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelDefinitionPageBuilder } from '../../src/core/ModelDefinitionPageBuilder';
import { LucidElementFactory } from '../../src/services/LucidElementFactory';
import { ModelDefinition, Model, SimulationTimeType, PeriodUnit } from '@quodsi/lucid-shared';
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

describe('ModelDefinitionPageBuilder.loadArrivalSchedules', () => {
    it('adds each stored schedule to the model definition', () => {
        const { builder, storageAdapter } = makeBuilder();
        const page = makeFakePage('page-1');
        storageAdapter.setArrivalSchedules(page, [
            { id: 'as-1', name: 'S1', timeUnit: 'hours', arrivals: [{ time: 1 }, { time: 2 }] } as any,
            { id: 'as-2', name: 'S2' } as any,
        ]);
        const modelDefinition = makeModelDefinition();

        (builder as any).loadArrivalSchedules(page, modelDefinition);

        expect(modelDefinition.arrivalSchedules.size()).toBe(2);
        const first = modelDefinition.arrivalSchedules.get('as-1');
        expect(first?.name).toBe('S1');
        expect(first?.timeUnit).toBe('hours');
        expect(first?.arrivals).toEqual([{ time: 1 }, { time: 2 }]);
        const second = modelDefinition.arrivalSchedules.get('as-2');
        expect(second?.name).toBe('S2');
    });

    it('leaves fields absent from storage at the ArrivalSchedule constructor defaults', () => {
        const { builder, storageAdapter } = makeBuilder();
        const page = makeFakePage('page-1');
        storageAdapter.setArrivalSchedules(page, [{ id: 'as-1', name: 'S1' } as any]);
        const modelDefinition = makeModelDefinition();

        (builder as any).loadArrivalSchedules(page, modelDefinition);

        const loaded = modelDefinition.arrivalSchedules.get('as-1');
        expect(loaded?.timeUnit).toBe(PeriodUnit.MINUTES);
        expect(loaded?.arrivals).toEqual([]);
    });

    it('leaves the list empty when nothing is stored', () => {
        const { builder } = makeBuilder();
        const page = makeFakePage('page-1');
        const modelDefinition = makeModelDefinition();

        (builder as any).loadArrivalSchedules(page, modelDefinition);

        expect(modelDefinition.arrivalSchedules.size()).toBe(0);
    });

    it('skips a corrupt entry without aborting the rest of the load', () => {
        const { builder, storageAdapter } = makeBuilder();
        const page = makeFakePage('page-1');
        storageAdapter.setArrivalSchedules(page, [
            { id: 'as-1', name: 'S1' } as any,
            // Simulate a genuinely bad entry via a null id, matching what a
            // corrupted/foreign JSON blob could contain -- same approach as
            // pageBuilder.arrivalPatterns.test.ts's corrupt-entry case.
            null as any,
            { id: 'as-2', name: 'S2' } as any,
        ]);
        const modelDefinition = makeModelDefinition();

        expect(() => {
            (builder as any).loadArrivalSchedules(page, modelDefinition);
        }).not.toThrow();

        expect(modelDefinition.arrivalSchedules.size()).toBe(2);
        expect(modelDefinition.arrivalSchedules.get('as-1')?.name).toBe('S1');
        expect(modelDefinition.arrivalSchedules.get('as-2')?.name).toBe('S2');
    });
});
