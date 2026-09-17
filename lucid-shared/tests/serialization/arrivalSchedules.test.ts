import { ModelDefinition, ArrivalSchedule } from '@quodsi/shared';
import { Model } from '@quodsi/lucid-shared';
import { modelDefinitionToCleanDocument } from '@quodsi/shared';
import type { ISerializedModel } from '@quodsi/shared';

describe('arrivalSchedules serialization', () => {
  function buildModel(): ModelDefinition {
    const model = new Model('doc-1', 'Test Model', 1);
    return new ModelDefinition(model);
  }

  it('emits arrivalSchedules when the model has one', () => {
    const def = buildModel();
    const schedule = new ArrivalSchedule('sched-1', 'Schedule 1');
    schedule.arrivals = [{ time: 10, entityId: 'ent-1', quantity: 2 }];
    def.arrivalSchedules.add(schedule);

    const out = modelDefinitionToCleanDocument(def);

    expect(out.arrivalSchedules).toBeDefined();
    expect(out.arrivalSchedules!.length).toBe(1);
    expect(out.arrivalSchedules![0].id).toBe('sched-1');
    expect(out.arrivalSchedules![0].arrivals).toEqual([
      { time: 10, entityId: 'ent-1', quantity: 2 }
    ]);
  });

  it('writes arrivalSchedules as [] when there are none (every list is always present)', () => {
    const def = buildModel();
    const out = modelDefinitionToCleanDocument(def);

    expect(out.arrivalSchedules).toEqual([]);
  });

  it('omits a schedule\'s own optional fields when it is left at its defaults', () => {
    const def = buildModel();
    const schedule = new ArrivalSchedule('sched-2', 'Schedule 2');
    // timeUnit left at its default (MINUTES); arrivals left empty.
    def.arrivalSchedules.add(schedule);

    const out = modelDefinitionToCleanDocument(def);

    expect(out.arrivalSchedules).toBeDefined();
    expect(out.arrivalSchedules!.length).toBe(1);
    const wire = out.arrivalSchedules![0] as unknown as Record<string, unknown>;
    expect(wire.id).toBe('sched-2');
    expect(wire.name).toBe('Schedule 2');
    expect('timeUnit' in wire).toBe(false);
    expect('arrivals' in wire).toBe(false);
  });
});
