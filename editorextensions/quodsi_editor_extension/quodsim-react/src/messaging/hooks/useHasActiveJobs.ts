import { useMessaging } from '../MessageProvider';
import { selectHasActiveJobs } from '../state/simulationRunSlice';

/**
 * Hook to check if there are any active simulation jobs running
 * Returns true if any simulation run has runState === RunState.Running
 *
 * Use this to disable UI elements (like the Run Simulation button) when a simulation is already running
 *
 * @returns boolean - true if any simulation runs are running
 */
export function useHasActiveJobs(): boolean {
  const state = useMessaging();
  return selectHasActiveJobs({ simulationRuns: state.simulationRuns });
}
