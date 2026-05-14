import { useCallback } from 'react';
import { EnvelopeMessageType } from '@quodsi/shared';
import { useSender } from './useSender';

/**
 * Custom hook that provides typed functions for sending scenario-related messages
 *
 * @returns Object containing scenario operations message sender functions
 */
export function useScenariosSender() {
  const send = useSender();

  /**
   * Send a SCENARIOS_LIST_REQUEST message to list scenarios and their simulation runs
   *
   * @param documentId Document ID to list scenarios for
   * @param pageId Page ID containing the scenarios
   */
  const listScenarios = useCallback((documentId: string, pageId: string) => {
    send(EnvelopeMessageType.SCENARIOS_LIST_REQUEST, {
      documentId,
      pageId
    });
  }, [send]);

  return {
    listScenarios
  };
}
