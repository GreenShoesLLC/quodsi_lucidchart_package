import { useCallback, useMemo } from 'react';
import { EnvelopeMessageType } from '@quodsi/shared';
import { useSender } from './useSender';

/**
 * Custom hook that provides typed functions for sending simulation-related messages
 *
 * @returns Object containing simulation message sender functions
 */
export function useSimulationSender() {
  const send = useSender();

  /**
   * Send a MODEL_RUN_REQUEST message
   *
   * @param documentId Document ID to simulate
   * @param scenarioName Optional scenario name
   * @param durationDays Optional duration in days
   * @param repetitions Optional number of repetitions
   * @param parameters Additional simulation parameters
   * @param scenarioDefinitionId Optional scenario definition ID (to apply change requests)
   */
  const requestSimulation = useCallback((
    documentId: string,
    scenarioName?: string,
    durationDays?: number,
    repetitions?: number,
    parameters?: Record<string, unknown>,
    scenarioDefinitionId?: string
  ) => {
    send(EnvelopeMessageType.MODEL_RUN_REQUEST, {
      documentId,
      scenarioName,
      durationDays,
      repetitions,
      parameters,
      scenarioDefinitionId
    });
  }, [send]);

  /**
   * Request to view simulation results
   *
   * @param documentId Document ID
   * @param jobId Optional job ID
   */
  const viewResults = useCallback((documentId: string, jobId?: string) => {
    // Use RESULTS_PAGE_CREATE to view results
    // Since ACTION_REQUEST is not available in EnvelopeMessageType
    send(EnvelopeMessageType.RESULTS_PAGE_CREATE, {
      documentId,
      jobId: jobId || 'current',
      createDashboard: true // This might need adjustment based on protocol
    });
  }, [send]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    requestSimulation,
    viewResults
  }), [requestSimulation, viewResults]);
}
