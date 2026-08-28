// tests/model/pageBuilder.workSchedules.test.ts
//
// Work schedules (spec 2026-08-27): ModelDefinitionPageBuilder must populate
// ModelDefinition.workSchedules from the page-level q_work_schedules list,
// mirroring loadArrivalSchedules / pageBuilder.arrivalSchedules.test.ts, and
// must carry `workScheduleId` off a stored q_resources record onto the
// Resource it builds -- without it the link never reaches the engine wire and
// a scheduled resource silently runs at fixed capacity.
//
// Fields absent from storage are left at the WorkSchedule constructor's
// defaults, and those defaults are exactly the values toJSON() omits at
// (offShiftCapacity 0, offShiftRule 'finish', pattern/exceptions []), so an
// absent key genuinely means "still default" -- no wire-default override is
// needed in the loader.

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

const NT_PATTERN = [
    { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '07:00', end: '15:00', capacity: 3 },
];

describe('ModelDefinitionPageBuilder.loadWorkSchedules', () => {
    it('adds each stored schedule to the model definition', () => {
        const { builder, storageAdapter } = makeBuilder();
        const page = makeFakePage('page-1');
        storageAdapter.setWorkSchedules(page, [
            {
                id: 'ws-1',
                name: 'Nursing team',
                offShiftCapacity: 1,
                pattern: NT_PATTERN,
                exceptions: [{ from: '2026-09-02T07:00:00', capacity: 4, note: 'trainee cover' }],
            } as any,
            { id: 'ws-2', name: 'Lathes' } as any,
        ]);
        const modelDefinition = makeModelDefinition();

        (builder as any).loadWorkSchedules(page, modelDefinition);

        expect(modelDefinition.workSchedules.size()).toBe(2);
        const first = modelDefinition.workSchedules.get('ws-1');
        expect(first?.name).toBe('Nursing team');
        expect(first?.offShiftCapacity).toBe(1);
        expect(first?.pattern).toEqual(NT_PATTERN);
        expect(first?.exceptions).toEqual([{ from: '2026-09-02T07:00:00', capacity: 4, note: 'trainee cover' }]);
        expect(modelDefinition.workSchedules.get('ws-2')?.name).toBe('Lathes');
    });

    it('leaves fields absent from storage at the WorkSchedule constructor defaults', () => {
        const { builder, storageAdapter } = makeBuilder();
        const page = makeFakePage('page-1');
        storageAdapter.setWorkSchedules(page, [{ id: 'ws-1', name: 'Nursing team' } as any]);
        const modelDefinition = makeModelDefinition();

        (builder as any).loadWorkSchedules(page, modelDefinition);

        const schedule = modelDefinition.workSchedules.get('ws-1')!;
        expect(schedule.offShiftCapacity).toBe(0);
        expect(schedule.offShiftRule).toBe('finish');
        expect(schedule.pattern).toEqual([]);
        expect(schedule.exceptions).toEqual([]);
        // Round-trips back to exactly what was stored: everything absent is
        // omitted again, so nothing churns.
        expect(schedule.toJSON()).toEqual({ id: 'ws-1', name: 'Nursing team' });
    });

    it('adds nothing when the page has no stored list', () => {
        const { builder } = makeBuilder();
        const page = makeFakePage('page-1');
        const modelDefinition = makeModelDefinition();

        (builder as any).loadWorkSchedules(page, modelDefinition);

        expect(modelDefinition.workSchedules.size()).toBe(0);
    });
});

describe('ModelDefinitionPageBuilder.loadResources carries workScheduleId', () => {
    it('carries a stored link onto the Resource, and onto its wire shape', () => {
        const { builder, storageAdapter } = makeBuilder();
        const page = makeFakePage('page-1');
        storageAdapter.setResources(page, [
            { id: 'res-1', name: 'Nurses', capacity: 3, workScheduleId: 'ws-1' } as any,
            { id: 'res-2', name: 'Techs', capacity: 1 } as any,
        ]);
        const modelDefinition = makeModelDefinition();

        (builder as any).loadResources(page, modelDefinition);

        expect(modelDefinition.resources.get('res-1')?.workScheduleId).toBe('ws-1');
        expect((modelDefinition.resources.get('res-1')!.toJSON() as any).workScheduleId).toBe('ws-1');
        // An unlinked resource stays unlinked -- and emits no key at all.
        expect(modelDefinition.resources.get('res-2')?.workScheduleId).toBeUndefined();
        expect('workScheduleId' in (modelDefinition.resources.get('res-2')!.toJSON() as any)).toBe(false);
    });
});
