import { createScenarioLever, type ScenarioLever, type LeverRange, ScenarioPropertyName, PROPERTY_DISPLAY_LABELS, ActionType } from '@quodsi/lucid-shared';

const DEFAULT_RANGE: LeverRange = { min: 1, max: 5, step: 1 };

/** Distinguishable default label so two levers on the same component don't both
 *  read as just the component name (e.g. "Start — Inter-arrival Timing"). */
function defaultLeverLabel(componentName: string, propertyName: ScenarioPropertyName): string {
  const prop = PROPERTY_DISPLAY_LABELS[propertyName] ?? propertyName;
  return `${componentName} — ${prop}`;
}

/** The component-level (no actionId) lever for a property, if any. */
export function leverFor(levers: ScenarioLever[], propertyName: ScenarioPropertyName): ScenarioLever | undefined {
  return levers.find((l) => l.propertyName === propertyName && !l.actionId);
}

/** Toggle a property's lever: add (default range, label = "Component — Property") or remove. */
export function toggleLever(levers: ScenarioLever[], propertyName: ScenarioPropertyName, componentName: string): ScenarioLever[] {
  const existing = leverFor(levers, propertyName);
  if (existing) return levers.filter((l) => l !== existing);
  return [...levers, createScenarioLever({ propertyName, label: defaultLeverLabel(componentName, propertyName), enabled: true, range: { ...DEFAULT_RANGE } })];
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

/** Default label for an Activity action-duration lever: the action's name when
 *  set, else a type-based fallback ("Process — duration rate" / "Delay — duration rate"). */
export function actionDurationLeverLabel(action: { name?: string; actionType: ActionType }): string {
  const named = action.name?.trim();
  if (named) return `${named}'s duration rate`;
  const typeLabel = action.actionType === ActionType.DELAY_WITH_RESOURCE ? 'Process' : 'Delay';
  return `${typeLabel} — duration rate`;
}

/** The action-scoped DURATION lever for an action id, if any. */
export function leverForAction(levers: ScenarioLever[], actionId: string): ScenarioLever | undefined {
  return levers.find((l) => l.actionId === actionId && l.propertyName === ScenarioPropertyName.DURATION);
}

/** Toggle an action-scoped DURATION lever: add (default range, given label) or remove. */
export function toggleActionLever(levers: ScenarioLever[], actionId: string, label: string): ScenarioLever[] {
  const existing = leverForAction(levers, actionId);
  if (existing) return levers.filter((l) => l !== existing);
  return [...levers, createScenarioLever({ propertyName: ScenarioPropertyName.DURATION, actionId, label, enabled: true, range: { ...DEFAULT_RANGE } })];
}

/** Patch an action lever (label and/or range). */
export function patchActionLever(levers: ScenarioLever[], actionId: string, patch: Partial<Pick<ScenarioLever, 'label' | 'range'>>): ScenarioLever[] {
  return levers.map((l) => (l.actionId === actionId && l.propertyName === ScenarioPropertyName.DURATION ? { ...l, ...patch } : l));
}

/** Patch one bound of an action lever's range. */
export function patchActionRange(levers: ScenarioLever[], actionId: string, key: keyof LeverRange, value: number): ScenarioLever[] {
  const l = leverForAction(levers, actionId);
  const range: LeverRange = { ...DEFAULT_RANGE, ...(l?.range ?? {}), [key]: value };
  return patchActionLever(levers, actionId, { range });
}
