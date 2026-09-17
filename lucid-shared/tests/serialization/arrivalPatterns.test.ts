import { ModelDefinition, ArrivalPattern } from '@quodsi/shared';
import { Model } from '@quodsi/lucid-shared';
import { modelDefinitionToCleanDocument } from '@quodsi/shared';
import type { ISerializedModel } from '@quodsi/shared';

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

    const out = modelDefinitionToCleanDocument(def);

    expect(out.arrivalPatterns).toBeDefined();
    expect(out.arrivalPatterns!.length).toBe(1);
    expect(out.arrivalPatterns![0].id).toBe('ap-1');
    expect(out.arrivalPatterns![0].seasonWeights).toEqual([1, 2, 3]);
  });

  it('writes arrivalPatterns as [] when there are none (every list is always present)', () => {
    const def = buildModel();
    const out = modelDefinitionToCleanDocument(def);

    expect(out.arrivalPatterns).toEqual([]);
  });
});
