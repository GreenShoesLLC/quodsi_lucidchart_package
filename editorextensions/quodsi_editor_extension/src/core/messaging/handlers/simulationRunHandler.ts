import { EnvelopeBase, EnvelopeMessageType, QUODSIM_VERSION } from '@quodsi/shared';
import { router } from '../index';
import { PanelRole } from '../types';
import { ModelManager } from '../../ModelManager';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';
import { SimulationHandler } from './simulationHandler';
import { ResultsModal } from '../../../panels/ResultsModal';

/**
 * Handler for simulation run management messages
 */
export class SimulationRunHandler {
  private static logger = ExtensionDebugService.forComponent('SimulationRunHandler');

  /**
   * Handle messages related to simulation run operations
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.SIMULATION_RUNS_LIST_REQUEST:
        // Handle async method - fire and forget, return true immediately
        SimulationRunHandler.handleSimulationRunsListRequest(msg).catch(error => {
          SimulationRunHandler.logger.error('Error in handleSimulationRunsListRequest:', error);
        });
        return true;

      case EnvelopeMessageType.SIMULATION_RUN_DELETE:
        // Handle async method - fire and forget, return true immediately
        SimulationRunHandler.handleSimulationRunDelete(msg).catch(error => {
          SimulationRunHandler.logger.error('Error in handleSimulationRunDelete:', error);
        });
        return true;

      case EnvelopeMessageType.CROSS_REP_DATA_REQUEST:
        // Handle async method - fire and forget, return true immediately
        SimulationRunHandler.handleCrossRepDataRequest(msg).catch(error => {
          SimulationRunHandler.logger.error('Error in handleCrossRepDataRequest:', error);
        });
        return true;

      case EnvelopeMessageType.CROSS_REP_BATCH_DATA_REQUEST:
        SimulationRunHandler.handleCrossRepBatchDataRequest(msg).catch(error => {
          SimulationRunHandler.logger.error('Error in handleCrossRepBatchDataRequest:', error);
        });
        return true;

      case EnvelopeMessageType.SIMULATION_RUN_RESIMULATE_REQUEST:
        // Handle async method - fire and forget, return true immediately
        SimulationRunHandler.handleResimulateRequest(msg).catch(error => {
          SimulationRunHandler.logger.error('Error in handleResimulateRequest:', error);
        });
        return true;

      case EnvelopeMessageType.OPEN_RESULTS_MODAL:
        SimulationRunHandler.handleOpenResultsModal(msg);
        return true;

      // Not a simulation run message
      default:
        return false;
    }
  }

  /**
   * Determine which channel to send a response to based on the message source.
   * Messages from 'results-iframe' are routed to the 'results' channel,
   * everything else goes to 'model'.
   */
  private static getResponseChannel(msg: EnvelopeBase): PanelRole {
    if (msg.source === 'results-iframe') return 'results';
    return 'model';
  }

  /**
   * Handle OPEN_RESULTS_MODAL by creating and showing a ResultsModal
   */
  private static handleOpenResultsModal(msg: EnvelopeBase): void {
    const data = msg.data as { scenarioId: string; documentId: string };
    SimulationRunHandler.logger.log('Opening results modal', {
      scenarioId: data.scenarioId,
      documentId: data.documentId
    });

    const client = ModelManager.getClient();
    const modal = new ResultsModal(client, data.scenarioId, data.documentId);
    modal.show();
  }

  /**
   * Handle simulation runs list request
   *
   * @param msg SIMULATION_RUNS_LIST_REQUEST message
   */
  private static async handleSimulationRunsListRequest(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as { documentId: string };

    SimulationRunHandler.logger.log('Simulation runs list requested', {
      documentId: data.documentId
    });

    try {
      // Get the EditorClient
      const client = ModelManager.getClient();

      SimulationRunHandler.logger.log('Calling data connector ListScenarios action...');

      // Call the data connector to list scenarios
      const result = await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_data_connector',
        actionName: 'ListScenarios',
        actionData: {
          documentId: data.documentId
        },
        asynchronous: true
      });

      // Debug logging to understand response structure
      SimulationRunHandler.logger.log('ListScenarios raw result type:', typeof result);
      SimulationRunHandler.logger.log('ListScenarios raw result:', JSON.stringify(result, null, 2));
      SimulationRunHandler.logger.log('result.json exists?', !!result?.json);
      SimulationRunHandler.logger.log('result.json.scenarios exists?', !!result?.json?.scenarios);

      // Extract the actual data from the Lucid SDK wrapper
      const responseData = result.json || result;

      SimulationRunHandler.logger.log('ListScenarios action completed successfully', {
        scenarioCount: responseData?.scenarios?.length || 0
      });

      // Reconcile active simulation jobs with scenario list
      // This replaces the need for separate GetDocumentStatus polling
      if (responseData?.scenarios) {
        SimulationHandler.reconcileWithScenarioList(
          data.documentId,
          responseData.scenarios
        );
      }

      // Send success response with the unwrapped data
      // Route to the correct channel (model or results) based on message source
      const responseChannel = SimulationRunHandler.getResponseChannel(msg);
      router.send(responseChannel, {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.SIMULATION_RUNS_LIST_RESULT,
        source: 'host',
        target: `${responseChannel}-iframe`,
        version: '1.0',
        data: responseData
      });

    } catch (error) {
      SimulationRunHandler.logger.error('Error listing simulation runs:', error);

      // Send error response
      const errorChannel = SimulationRunHandler.getResponseChannel(msg);
      router.send(errorChannel, {
        id: msg.id,
        type: EnvelopeMessageType.ERROR,
        source: 'host',
        target: `${errorChannel}-iframe`,
        version: '1.0',
        data: {
          code: 'SIMULATION_RUNS_LIST_FAILED',
          message: error instanceof Error ? error.message : String(error),
          relatedTo: EnvelopeMessageType.SIMULATION_RUNS_LIST_REQUEST
        }
      });
    }
  }

  /**
   * Handle simulation run deletion request
   *
   * @param msg SIMULATION_RUN_DELETE message
   */
  private static async handleSimulationRunDelete(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as { documentId: string; scenarioId: string };

    SimulationRunHandler.logger.log('Simulation run deletion requested', {
      documentId: data.documentId,
      scenarioId: data.scenarioId
    });

    try {
      // Get the EditorClient
      const client = ModelManager.getClient();

      SimulationRunHandler.logger.log('Calling data connector DeleteScenario action...');

      // Call the data connector to delete scenario
      const result = await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_data_connector',
        actionName: 'DeleteScenario',
        actionData: {
          documentId: data.documentId,
          scenarioId: data.scenarioId
        },
        asynchronous: true
      });

      // Extract the actual data from the Lucid SDK wrapper
      const responseData = result.json || result;

      SimulationRunHandler.logger.log('DeleteScenario action completed', {
        success: responseData?.success,
        documentId: data.documentId,
        scenarioId: data.scenarioId
      });

      // Clean up any active simulation jobs for this scenario
      if (responseData?.success) {
        SimulationRunHandler.logger.log('Cleaning up job tracking for deleted simulation run');
        SimulationHandler.stopPollingForScenario(data.scenarioId);
      }

      // Send success response
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.SIMULATION_RUN_DELETE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: responseData?.success || false,
          documentId: data.documentId,
          scenarioId: data.scenarioId,
          error: responseData?.error
        }
      });

    } catch (error) {
      SimulationRunHandler.logger.error('Error deleting simulation run:', error);

      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.SIMULATION_RUN_DELETE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: false,
          documentId: data.documentId,
          scenarioId: data.scenarioId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Handle cross-rep data request
   *
   * @param msg CROSS_REP_DATA_REQUEST message
   */
  private static async handleCrossRepDataRequest(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as {
      documentId: string;
      scenarioId: string;
      dataType: 'scenario' | 'activity' | 'entity' | 'resource' | 'activity-entity' | 'activity-contents-timeseries' | 'state-summary' | 'activity-inbound-queue-timeseries' | 'activity-outbound-queue-timeseries' | 'state-values-timeseries' | 'entity-throughput-timeseries'
    };

    SimulationRunHandler.logger.log('Cross-rep data requested', {
      documentId: data.documentId,
      scenarioId: data.scenarioId,
      dataType: data.dataType
    });

    try {
      const client = ModelManager.getClient();

      SimulationRunHandler.logger.log(`Calling GetResultsData for ${data.dataType}...`);

      const result = await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'GetResultsData',
        actionData: {
          documentId: data.documentId,
          scenarioId: data.scenarioId,
          dataTypes: [data.dataType]
        },
        asynchronous: false
      });

      const responseData = result.json || result;
      const typeResult = responseData.results?.[data.dataType] || {
        success: false,
        data: [],
        recordCount: 0,
        error: 'No data returned'
      };

      SimulationRunHandler.logger.log(`GetResultsData completed for ${data.dataType}`, {
        success: typeResult?.success,
        recordCount: typeResult?.recordCount || 0
      });

      const responseChannel = SimulationRunHandler.getResponseChannel(msg);
      router.send(responseChannel, {
        id: msg.id,
        type: EnvelopeMessageType.CROSS_REP_DATA_RESULT,
        source: 'host',
        target: `${responseChannel}-iframe`,
        version: '1.0',
        data: {
          ...typeResult,
          dataType: data.dataType,
          scenarioId: data.scenarioId
        }
      });

    } catch (error) {
      SimulationRunHandler.logger.error('Error fetching cross-rep data:', error);

      // Send error response
      const errorChannel = SimulationRunHandler.getResponseChannel(msg);
      router.send(errorChannel, {
        id: msg.id,
        type: EnvelopeMessageType.ERROR,
        source: 'host',
        target: `${errorChannel}-iframe`,
        version: '1.0',
        data: {
          code: 'CROSS_REP_DATA_FAILED',
          message: error instanceof Error ? error.message : String(error),
          relatedTo: EnvelopeMessageType.CROSS_REP_DATA_REQUEST,
          dataType: data.dataType,
          scenarioId: data.scenarioId
        }
      });
    }
  }

  /**
   * Handle batch cross-rep data request — fetches multiple data types in a single API call.
   */
  private static async handleCrossRepBatchDataRequest(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as {
      documentId: string;
      scenarioId: string;
      dataTypes: string[];
    };

    SimulationRunHandler.logger.log('Batch cross-rep data requested', {
      documentId: data.documentId,
      scenarioId: data.scenarioId,
      dataTypes: data.dataTypes
    });

    try {
      const client = ModelManager.getClient();

      const result = await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'GetResultsData',
        actionData: {
          documentId: data.documentId,
          scenarioId: data.scenarioId,
          dataTypes: data.dataTypes
        },
        asynchronous: false
      });

      const responseData = result.json || result;

      SimulationRunHandler.logger.log('Batch GetResultsData completed', {
        success: responseData?.success,
        dataTypes: data.dataTypes
      });

      const responseChannel = SimulationRunHandler.getResponseChannel(msg);
      router.send(responseChannel, {
        id: msg.id,
        type: EnvelopeMessageType.CROSS_REP_BATCH_DATA_RESULT,
        source: 'host',
        target: `${responseChannel}-iframe`,
        version: '1.0',
        data: {
          success: responseData?.success ?? false,
          results: responseData?.results ?? {},
          scenarioId: data.scenarioId
        }
      });

    } catch (error) {
      SimulationRunHandler.logger.error('Error fetching batch cross-rep data:', error);

      const errorChannel = SimulationRunHandler.getResponseChannel(msg);
      router.send(errorChannel, {
        id: msg.id,
        type: EnvelopeMessageType.ERROR,
        source: 'host',
        target: `${errorChannel}-iframe`,
        version: '1.0',
        data: {
          code: 'CROSS_REP_BATCH_DATA_FAILED',
          message: error instanceof Error ? error.message : String(error),
          relatedTo: EnvelopeMessageType.CROSS_REP_BATCH_DATA_REQUEST,
          scenarioId: data.scenarioId
        }
      });
    }
  }

  /**
   * Handle simulation run resimulate request
   *
   * @param msg SIMULATION_RUN_RESIMULATE_REQUEST message
   */
  private static async handleResimulateRequest(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as { documentId: string; scenarioId: string; scenarioName: string };

    SimulationRunHandler.logger.log('Simulation run resimulate requested', {
      documentId: data.documentId,
      scenarioId: data.scenarioId,
      scenarioName: data.scenarioName
    });

    try {
      // Get the EditorClient
      const client = ModelManager.getClient();

      SimulationRunHandler.logger.log('Calling data connector SubmitSimulationJob action...');

      // Call the data connector to submit simulation job (reuses existing model.json)
      const result = await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_data_connector',
        actionName: 'SubmitSimulationJob',
        actionData: {
          documentId: data.documentId,
          scenarioId: data.scenarioId,
          scenarioName: data.scenarioName,
          appVersion: QUODSIM_VERSION
        },
        asynchronous: true
      });

      // Extract the actual data from the Lucid SDK wrapper
      const responseData = result.json || result;

      SimulationRunHandler.logger.log('SubmitSimulationJob action completed', {
        success: responseData?.success,
        documentId: data.documentId,
        scenarioId: data.scenarioId
      });

      if (responseData?.success) {
        // Job submitted successfully
        // Note: Status updates will come from ListScenarios reconciliation
        // (called by ScenarioEditor periodically) using scenarioId
        const timestamp = new Date().toISOString();

        // Send initial MODEL_RUN_STATUS with PROCESSING state
        router.send('model', {
          id: msg.id,
          type: EnvelopeMessageType.MODEL_RUN_STATUS,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            documentId: data.documentId,
            scenarioId: data.scenarioId,
            scenarioName: data.scenarioName,
            status: 'PROCESSING',
            progress: 10,
            currentStep: 'Simulation resubmitted to backend',
            lastChecked: timestamp,
            queuedAt: timestamp
          }
        });
      } else {
        // Job submission failed
        throw new Error(responseData?.error || 'Failed to submit simulation job');
      }

    } catch (error) {
      SimulationRunHandler.logger.error('Error resimulating:', error);

      // Send MODEL_RUN_STATUS with FAILED status
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_RUN_STATUS,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          documentId: data.documentId,
          scenarioId: data.scenarioId,
          scenarioName: data.scenarioName,
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
          message: 'Failed to start resimulation'
        }
      });
    }
  }

}
