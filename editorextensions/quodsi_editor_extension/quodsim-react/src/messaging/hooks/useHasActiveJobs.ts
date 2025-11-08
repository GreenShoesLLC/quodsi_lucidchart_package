import { useMessaging } from '../MessageProvider';
import { selectHasActiveJobs } from '../state/scenarioSlice';

/**
 * Hook to check if there are any active simulation jobs running
 * Returns true if any scenario has runState === RunState.Running
 *
 * Use this to disable UI elements (like the Run Simulation button) when a simulation is already running
 *
 * @returns boolean - true if any scenarios are running
 */
export function useHasActiveJobs(): boolean {
  const state = useMessaging();
  return selectHasActiveJobs({ scenarios: state.scenarios });
}
