import { EnvelopeMessageType } from '@quodsi/shared';
import { useSender } from './useSender';

/**
 * Custom hook that provides typed functions for sending scenario-related messages
 *
 * @returns Object containing scenario operations message sender functions
 */
export function useScenarioSender() {
  const send = useSender();

  /**
   * Send a SCENARIOS_LIST_REQUEST message
   *
   * @param documentId Document ID to list scenarios for
   */
  const listScenarios = (documentId: string) => {
    send(EnvelopeMessageType.SCENARIOS_LIST_REQUEST, {
      documentId
    });
  };

  /**
   * Send a SCENARIO_DELETE message
   *
   * @param documentId Document ID containing the scenario
   * @param scenarioId Scenario ID to delete
   */
  const deleteScenario = (documentId: string, scenarioId: string) => {
    send(EnvelopeMessageType.SCENARIO_DELETE, {
      documentId,
      scenarioId
    });
  };

  return {
    listScenarios,
    deleteScenario
  };
}
