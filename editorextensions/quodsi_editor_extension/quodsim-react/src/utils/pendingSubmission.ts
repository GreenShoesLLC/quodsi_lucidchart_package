/**
 * Simple module-level store for pending simulation submission state.
 * Used to show a placeholder card in ScenarioEditor immediately after
 * the user clicks "Run Simulation", before MODEL_RUN_STATUS arrives.
 */

let pendingScenarioName: string | null = null;

/**
 * Set the pending scenario name.
 * Call this when the user triggers a simulation run.
 */
export function setPendingSubmission(scenarioName: string): void {
  pendingScenarioName = scenarioName;
}

/**
 * Get and clear the pending scenario name.
 * Returns the name (if any) and clears it so it's only used once.
 */
export function consumePendingSubmission(): string | null {
  const name = pendingScenarioName;
  pendingScenarioName = null;
  return name;
}

/**
 * Check if there's a pending submission without consuming it.
 */
export function hasPendingSubmission(): boolean {
  return pendingScenarioName !== null;
}

/**
 * Clear the pending submission without consuming the value.
 */
export function clearPendingSubmission(): void {
  pendingScenarioName = null;
}
