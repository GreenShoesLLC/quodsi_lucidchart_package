/**
 * Whether the model editor shows the embedded-Studio "Scenarios" modal button
 * (Phase 2) instead of the legacy Scenarios tab. Default OFF during rollout:
 * enable by setting localStorage quodsi_scenarios_modal = 'true'.
 */
export function isScenariosModalEnabled(): boolean {
  try {
    return localStorage.getItem('quodsi_scenarios_modal') === 'true';
  } catch {
    return false;
  }
}
