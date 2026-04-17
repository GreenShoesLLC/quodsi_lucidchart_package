import { useCallback } from 'react';
import { EnvelopeMessageType } from '@quodsi/shared';
import { useSender } from './useSender';

/**
 * Custom hook that provides typed functions for sending simulation run-related messages
 *
 * @returns Object containing simulation run operations message sender functions
 */
export function useSimulationRunSender() {
  const send = useSender();

  /**
   * Send a SIMULATION_RUNS_LIST_REQUEST message
   *
   * @param documentId Document ID to list simulation runs for
   */
  const listSimulationRuns = useCallback((documentId: string) => {
    send(EnvelopeMessageType.SIMULATION_RUNS_LIST_REQUEST, {
      documentId
    });
  }, [send]);

  /**
   * Send a SIMULATION_RUN_DELETE message
   *
   * @param documentId Document ID containing the simulation run
   * @param simulationRunId Simulation run ID to delete
   */
  const deleteSimulationRun = useCallback((documentId: string, scenarioId: string) => {
    send(EnvelopeMessageType.SIMULATION_RUN_DELETE, {
      documentId,
      scenarioId
    });
  }, [send]);

  /**
   * Send a SIMULATION_RUN_RESIMULATE_REQUEST message
   *
   * @param documentId Document ID containing the simulation run
   * @param simulationRunId Simulation run ID to resimulate
   * @param simulationRunName Simulation run name for display
   */
  const resimulateSimulationRun = useCallback((
    documentId: string,
    simulationRunId: string,
    simulationRunName: string
  ) => {
    send(EnvelopeMessageType.SIMULATION_RUN_RESIMULATE_REQUEST, {
      documentId,
      simulationRunId,
      simulationRunName
    });
  }, [send]);

  /**
   * Send a CROSS_REP_DATA_REQUEST message
   *
   * @param documentId Document ID containing the simulation run
   * @param scenarioId Scenario ID to fetch data for
   * @param dataType Type of cross-rep data to fetch (scenario, activity, entity, resource, activity-contents-timeseries, state-summary, activity-inbound-queue-timeseries, activity-outbound-queue-timeseries, or state-values-timeseries)
   */
  const getCrossRepData = useCallback((
    documentId: string,
    scenarioId: string,
    dataType: 'scenario' | 'activity' | 'entity' | 'resource' | 'activity-entity' | 'activity-contents-timeseries' | 'state-summary' | 'activity-inbound-queue-timeseries' | 'activity-outbound-queue-timeseries' | 'state-values-timeseries' | 'entity-throughput-timeseries'
  ) => {
    send(EnvelopeMessageType.CROSS_REP_DATA_REQUEST, {
      documentId,
      scenarioId,
      dataType
    });
  }, [send]);

  /**
   * Send a CROSS_REP_BATCH_DATA_REQUEST message to fetch multiple data types in one round trip
   */
  const getCrossRepBatchData = useCallback((
    documentId: string,
    scenarioId: string,
    dataTypes: string[]
  ) => {
    send(EnvelopeMessageType.CROSS_REP_BATCH_DATA_REQUEST, {
      documentId,
      scenarioId,
      dataTypes
    });
  }, [send]);

  /**
   * Send an OPEN_RESULTS_MODAL message to open simulation results in a full-width modal
   *
   * @param documentId Document ID
   * @param scenarioId Scenario ID to view results for
   */
  const openResultsModal = useCallback((documentId: string, scenarioId: string) => {
    send(EnvelopeMessageType.OPEN_RESULTS_MODAL, {
      scenarioId,
      documentId
    });
  }, [send]);

  return {
    listSimulationRuns,
    deleteSimulationRun,
    resimulateSimulationRun,
    getCrossRepData,
    getCrossRepBatchData,
    openResultsModal
  };
}
