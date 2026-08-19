import { ModelDefinition, ArrivalPattern } from '@quodsi/shared';
import { Model } from '@quodsi/lucid-shared';
import { ModelSerializerFactory } from '../../src/serialization/ModelSerializerFactory';
import { ISerializedModel } from '../../src/serialization/interfaces/ISerializedModel';

describe('arrivalPatterns serialization', () => {
  function buildModel(): ModelDefinition {
    const model = new Model('doc-1', 'Test Model', 1);
    return new ModelDefinition(model);
  }

  it('emits arrivalPatterns when the model has one', () => {
    const def = buildModel();
    const pattern = new ArrivalPattern('ap-1', 'Generator 1 pattern');
    pattern.seasonWeights = [1, 2, 3];
    def.arrivalPatterns.add(pattern);

    const serializer = ModelSerializerFactory.create(def);
    const out = serializer.serialize(def) as ISerializedModel;

    expect(out.arrivalPatterns).toBeDefined();
    expect(out.arrivalPatterns!.length).toBe(1);
    expect(out.arrivalPatterns![0].id).toBe('ap-1');
    expect(out.arrivalPatterns![0].seasonWeights).toEqual([1, 2, 3]);
  });

  it('omits arrivalPatterns entirely when there are none', () => {
    const def = buildModel();
    const serializer = ModelSerializerFactory.create(def);
    const out = serializer.serialize(def) as ISerializedModel;

    expect(out.arrivalPatterns).toBeUndefined();
  });
});
