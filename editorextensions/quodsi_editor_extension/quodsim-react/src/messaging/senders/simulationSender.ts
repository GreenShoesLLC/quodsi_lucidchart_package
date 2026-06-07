import { useCallback, useMemo } from 'react';
import { EnvelopeMessageType } from '@quodsi/lucid-shared';
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
   * @param enableAnimation Opt-in: generate animation data (first replication only). Default off.
   */
  const requestSimulation = useCallback((
    documentId: string,
    scenarioName?: string,
    durationDays?: number,
    repetitions?: number,
    parameters?: Record<string, unknown>,
    scenarioDefinitionId?: string,
    enableAnimation?: boolean
  ) => {
    send(EnvelopeMessageType.MODEL_RUN_REQUEST, {
      documentId,
      scenarioName,
      durationDays,
      repetitions,
      parameters,
      scenarioDefinitionId,
      enableAnimation
    });
  }, [send]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    requestSimulation
  }), [requestSimulation]);
}
