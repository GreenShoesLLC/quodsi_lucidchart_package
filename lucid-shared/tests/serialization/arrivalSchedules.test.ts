import { ModelDefinition, ArrivalSchedule } from '@quodsi/shared';
import { Model } from '@quodsi/lucid-shared';
import { ModelSerializerFactory } from '../../src/serialization/ModelSerializerFactory';
import { ISerializedModel } from '../../src/serialization/interfaces/ISerializedModel';

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

    const serializer = ModelSerializerFactory.create(def);
    const out = serializer.serialize(def) as ISerializedModel;

    expect(out.arrivalSchedules).toBeDefined();
    expect(out.arrivalSchedules!.length).toBe(1);
    expect(out.arrivalSchedules![0].id).toBe('sched-1');
    expect(out.arrivalSchedules![0].arrivals).toEqual([
      { time: 10, entityId: 'ent-1', quantity: 2 }
    ]);
  });

  it('omits arrivalSchedules entirely when there are none', () => {
    const def = buildModel();
    const serializer = ModelSerializerFactory.create(def);
    const out = serializer.serialize(def) as ISerializedModel;

    expect(out.arrivalSchedules).toBeUndefined();
  });

  it('omits both arrivalSchedules and the schedule\'s own optional fields when a schedule is left at its defaults', () => {
    const def = buildModel();
    const schedule = new ArrivalSchedule('sched-2', 'Schedule 2');
    // timeUnit left at its default (MINUTES); arrivals left empty.
    def.arrivalSchedules.add(schedule);

    const serializer = ModelSerializerFactory.create(def);
    const out = serializer.serialize(def) as ISerializedModel;

    expect(out.arrivalSchedules).toBeDefined();
    expect(out.arrivalSchedules!.length).toBe(1);
    const wire = out.arrivalSchedules![0] as unknown as Record<string, unknown>;
    expect(wire.id).toBe('sched-2');
    expect(wire.name).toBe('Schedule 2');
    expect('timeUnit' in wire).toBe(false);
    expect('arrivals' in wire).toBe(false);
  });
});
