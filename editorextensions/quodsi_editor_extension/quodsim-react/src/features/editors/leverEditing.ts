import { createScenarioLever, type ScenarioLever, type LeverRange, ScenarioPropertyName } from '@quodsi/lucid-shared';

const DEFAULT_RANGE: LeverRange = { min: 1, max: 5, step: 1 };

/** The component-level (no actionId) lever for a property, if any. */
export function leverFor(levers: ScenarioLever[], propertyName: ScenarioPropertyName): ScenarioLever | undefined {
  return levers.find((l) => l.propertyName === propertyName && !l.actionId);
}

/** Toggle a property's lever: add (default range, label = componentName) or remove. */
export function toggleLever(levers: ScenarioLever[], propertyName: ScenarioPropertyName, componentName: string): ScenarioLever[] {
  const existing = leverFor(levers, propertyName);
  if (existing) return levers.filter((l) => l !== existing);
  return [...levers, createScenarioLever({ propertyName, label: componentName, enabled: true, range: { ...DEFAULT_RANGE } })];
}

/** Patch the property's lever (label and/or range). */
export function patchLever(levers: ScenarioLever[], propertyName: ScenarioPropertyName, patch: Partial<Pick<ScenarioLever, 'label' | 'range'>>): ScenarioLever[] {
  return levers.map((l) => (l.propertyName === propertyName && !l.actionId ? { ...l, ...patch } : l));
}

/** Patch one bound of the property lever's range. */
export function patchRange(levers: ScenarioLever[], propertyName: ScenarioPropertyName, key: keyof LeverRange, value: number): ScenarioLever[] {
  const l = leverFor(levers, propertyName);
  const range: LeverRange = { ...DEFAULT_RANGE, ...(l?.range ?? {}), [key]: value };
  return patchLever(levers, propertyName, { range });
}
