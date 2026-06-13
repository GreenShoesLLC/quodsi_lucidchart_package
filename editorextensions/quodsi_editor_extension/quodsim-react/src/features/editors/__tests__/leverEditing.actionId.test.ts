import { leverForAction, toggleActionLever, patchActionLever, patchActionRange, toggleLever } from '../leverEditing';
import { ScenarioPropertyName, type ScenarioLever } from '@quodsi/lucid-shared';

describe('actionId-keyed lever editing', () => {
  it('toggles an action-scoped DURATION lever on and off', () => {
    const added = toggleActionLever([], 'act-7', 'Triage speed');
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ propertyName: ScenarioPropertyName.DURATION, actionId: 'act-7', label: 'Triage speed' });
    expect(added[0].range).toEqual({ min: 1, max: 5, step: 1 });
    const removed = toggleActionLever(added, 'act-7', 'Triage speed');
    expect(removed).toHaveLength(0);
  });

  it('leverForAction finds by actionId only', () => {
    const levers = toggleActionLever([], 'act-7', 'x');
    expect(leverForAction(levers, 'act-7')?.actionId).toBe('act-7');
    expect(leverForAction(levers, 'nope')).toBeUndefined();
  });

  it('patchActionRange updates one bound', () => {
    const levers = toggleActionLever([], 'act-7', 'x');
    const patched = patchActionRange(levers, 'act-7', 'max', 4);
    expect(leverForAction(patched, 'act-7')?.range).toEqual({ min: 1, max: 4, step: 1 });
  });

  it('does not disturb a property-keyed lever', () => {
    const withCap = toggleLever([], ScenarioPropertyName.ACTIVITY_CAPACITY, 'Triage');
    const both = toggleActionLever(withCap, 'act-7', 'x');
    expect(both).toHaveLength(2);
    const patched = patchActionLever(both, 'act-7', { label: 'renamed' });
    const cap = patched.find((l: ScenarioLever) => l.propertyName === ScenarioPropertyName.ACTIVITY_CAPACITY);
    expect(cap?.label).toBe('Triage');
  });
});
