import { createScenarioLever, isRangeableProperty, ScenarioObjectType, ScenarioPropertyName } from '../index';

it('re-exports the ScenarioLever API from @quodsi/shared', () => {
  const lever = createScenarioLever({ propertyName: ScenarioPropertyName.CAPACITY, label: 'Nurses' });
  expect(lever.leverId).toBeTruthy();
  expect(isRangeableProperty(ScenarioObjectType.RESOURCE, ScenarioPropertyName.CAPACITY)).toBe(true);
});
