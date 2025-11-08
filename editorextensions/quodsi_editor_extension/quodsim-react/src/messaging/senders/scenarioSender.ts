import { useCallback } from 'react';
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
  const listScenarios = useCallback((documentId: string) => {
    send(EnvelopeMessageType.SCENARIOS_LIST_REQUEST, {
      documentId
    });
  }, [send]);

  /**
   * Send a SCENARIO_DELETE message
   *
   * @param documentId Document ID containing the scenario
   * @param scenarioId Scenario ID to delete
   */
  const deleteScenario = useCallback((documentId: string, scenarioId: string) => {
    send(EnvelopeMessageType.SCENARIO_DELETE, {
      documentId,
      scenarioId
    });
  }, [send]);

  /**
   * Send a CROSS_REP_DATA_REQUEST message
   *
   * @param documentId Document ID containing the scenario
   * @param scenarioId Scenario ID to fetch data for
   * @param dataType Type of cross-rep data to fetch (activity, entity, resource, activity-contents-timeseries, state-summary, activity-input-buffer-timeseries, or activity-output-buffer-timeseries)
   */
  const getCrossRepData = useCallback((
    documentId: string,
    scenarioId: string,
    dataType: 'activity' | 'entity' | 'resource' | 'activity-contents-timeseries' | 'state-summary' | 'activity-input-buffer-timeseries' | 'activity-output-buffer-timeseries'
  ) => {
    send(EnvelopeMessageType.CROSS_REP_DATA_REQUEST, {
      documentId,
      scenarioId,
      dataType
    });
  }, [send]);

  return {
    listScenarios,
    deleteScenario,
    getCrossRepData
  };
}
