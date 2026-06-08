import { ResourceRequirementModification } from '@quodsi/lucid-shared';
import { ScenarioPropertyName } from '@quodsi/lucid-shared';

describe('ResourceRequirementModification', () => {
  it('toJSON emits the reference discriminator', () => {
    const mod = new ResourceRequirementModification({
      propertyName: ScenarioPropertyName.RESOURCE_REQUIREMENT,
      resourceRequirementId: 'rr-new',
    });
    expect(mod.toJSON()).toEqual({
      type: 'reference',
      propertyName: 'RESOURCE_REQUIREMENT',
      resourceRequirementId: 'rr-new',
    });
  });

  it('fromJSON round-trips', () => {
    const data = { type: 'reference', propertyName: 'RESOURCE_REQUIREMENT', resourceRequirementId: 'rr-new' };
    const mod = ResourceRequirementModification.fromJSON(data);
    expect(mod.propertyName).toBe(ScenarioPropertyName.RESOURCE_REQUIREMENT);
    expect(mod.resourceRequirementId).toBe('rr-new');
    expect(mod.toJSON()).toEqual(data);
  });

  it('fromJSON defaults missing resourceRequirementId to empty string', () => {
    const mod = ResourceRequirementModification.fromJSON({ type: 'reference', propertyName: 'RESOURCE_REQUIREMENT' });
    expect(mod.resourceRequirementId).toBe('');
  });
});
