import { EnvelopeBase, EnvelopeMessageType, QUODSIM_VERSION } from '@quodsi/shared';
import { Viewport } from 'lucid-extension-sdk';
import { router } from '../index';
import { PanelRole } from '../types';
import { ModelManager } from '../../ModelManager';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';
import { SimulationHandler } from './simulationHandler';
import { ResultsModal } from '../../../panels/ResultsModal';
import { StudioEmbedSpikeModal } from '../../../panels/StudioEmbedSpikeModal';

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
      case EnvelopeMessageType.SCENARIOS_LIST_REQUEST:
        // Both list operations pull the same data (scenarios + nested runs)
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

      case EnvelopeMessageType.SIMULATION_RUN_CANCEL_REQUEST:
        SimulationRunHandler.handleSimulationRunCancel(msg).catch(error => {
          SimulationRunHandler.logger.error('Error in handleSimulationRunCancel:', error);
        });
        return true;

      case EnvelopeMessageType.OPEN_RESULTS_MODAL:
        SimulationRunHandler.handleOpenResultsModal(msg);
        return true;

      case EnvelopeMessageType.OPEN_STUDIO_EMBED_SPIKE:
        SimulationRunHandler.handleOpenStudioEmbedSpike(msg);
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
   * Handle OPEN_STUDIO_EMBED_SPIKE by creating and showing a StudioEmbedSpikeModal
   */
  private static handleOpenStudioEmbedSpike(_msg: EnvelopeBase): void {
    SimulationRunHandler.logger.log('Opening studio embed spike modal');
    const client = ModelManager.getClient();
    const modal = new StudioEmbedSpikeModal(client);
    modal.show();
  }

  /**
   * Handle simulation runs list request
   *
   * @param msg SIMULATION_RUNS_LIST_REQUEST message
   */
  /**
   * Map DB run status to the RunState values React expects
   */
  public static mapStatusToRunState(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'RAN_SUCCESSFULLY';
      case 'FAILED': return 'RAN_WITH_ERRORS';
      case 'RUNNING': return 'RUNNING';
      case 'QUEUED': return 'QUEUED';
      case 'CANCELLED': return 'CANCELLED';
      default: return 'NOT_RUN';
    }
  }

  /**
   * Transform nested API response (scenarios with runs) into flat SimulationRunInfo list
   */
  public static transformToFlatScenarioList(apiScenarios: any[]): any[] {
    return apiScenarios.map(scenario => {
      const latestRun = scenario.runs?.[0]; // runs are ordered by created_at DESC
      const runState = latestRun
        ? SimulationRunHandler.mapStatusToRunState(latestRun.status)
        : 'NOT_RUN';
      const hasResults = runState === 'RAN_SUCCESSFULLY';

      return {
        id: scenario.id,
        name: scenario.name,
        isBaseline: scenario.isBaseline === true,
        runState,
        hasResults,
        reps: 0,
        runClockPeriod: 0,
        runClockPeriodUnit: 'MINUTES',
        simulationTimeType: 'Clock',
        completedAt: latestRun?.completed_at || undefined,
        currentReplication: latestRun?.current_replication || undefined,
        error: latestRun?.error || undefined,
        errorType: latestRun?.error_type || undefined,
        errorDetails: latestRun?.error_details || undefined,
        errorSuggestions: latestRun?.error_suggestions || undefined,
        startTime: latestRun?.start_time || latestRun?.submitted_at || undefined,
        endTime: latestRun?.end_time || latestRun?.completed_at || undefined,
        metrics: latestRun?.metrics || undefined,
        outputSchemaVersion: latestRun?.output_schema_version ?? null,
        engineVersion: latestRun?.engine_version ?? null,
        orgCode: latestRun?.org_code ?? null,
      };
    });
  }

  private static async handleSimulationRunsListRequest(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as { documentId: string };

    const messageType = msg.type === EnvelopeMessageType.SCENARIOS_LIST_REQUEST
      ? 'Scenarios list'
      : 'Simulation runs list';
    SimulationRunHandler.logger.log(`${messageType} requested`, {
      documentId: data.documentId
    });

    try {
      const client = ModelManager.getClient();
      const viewport = new Viewport(client);
      const currentPage = viewport.getCurrentPage();
      const pageId = currentPage?.id || '';

      SimulationRunHandler.logger.log('Calling quodsi_api ListScenarios...');

      const result = await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'ListScenarios',
        actionData: {
          documentId: data.documentId,
          pageId
        },
        asynchronous: false
      });

      const responseData = result.json || result;

      // Transform nested scenarios+runs into flat SimulationRunInfo list
      const flatScenarios = responseData?.scenarios
        ? SimulationRunHandler.transformToFlatScenarioList(responseData.scenarios)
        : [];

      SimulationRunHandler.logger.log('ListScenarios completed', {
        scenarioCount: flatScenarios.length
      });

      // Reconcile active simulation jobs with scenario list
      if (flatScenarios.length > 0) {
        SimulationHandler.reconcileWithScenarioList(
          data.documentId,
          flatScenarios
        );
      }

      // Send success response in the shape React expects
      const responseChannel = SimulationRunHandler.getResponseChannel(msg);
      router.send(responseChannel, {
        id: msg.id,
        type: EnvelopeMessageType.SIMULATION_RUNS_LIST_RESULT,
        source: 'host',
        target: `${responseChannel}-iframe`,
        version: '1.0',
        data: {
          success: true,
          documentId: data.documentId,
          scenarios: flatScenarios,
          generatedAt: responseData?.generatedAt || new Date().toISOString()
        }
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

      const result = await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'DeleteScenario',
        actionData: {
          documentId: data.documentId,
          scenarioId: data.scenarioId
        },
        asynchronous: false
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
   * Handle simulation run cancel request
   *
   * @param msg SIMULATION_RUN_CANCEL_REQUEST message
   */
  private static async handleSimulationRunCancel(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as { documentId: string; pageId: string; scenarioId: string };

    SimulationRunHandler.logger.log('Simulation run cancel requested', {
      documentId: data.documentId,
      scenarioId: data.scenarioId
    });

    try {
      const client = ModelManager.getClient();

      const result = await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'CancelSimulation',
        actionData: {
          documentId: data.documentId,
          pageId: data.pageId,
          scenarioId: data.scenarioId
        },
        asynchronous: false
      });

      const responseData = result.json || result;

      if (responseData?.success) {
        SimulationHandler.stopPollingForScenario(data.scenarioId);
      }

      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.SIMULATION_RUN_CANCEL_RESULT,
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
      SimulationRunHandler.logger.error('Error cancelling simulation run:', error);
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.SIMULATION_RUN_CANCEL_RESULT,
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
      const client = ModelManager.getClient();
      const viewport = new Viewport(client);
      const currentPage = viewport.getCurrentPage();
      const pageId = currentPage?.id || '';

      SimulationRunHandler.logger.log('Calling SubmitSimulationJob action...');

      const result = await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'SubmitSimulationJob',
        actionData: {
          documentId: data.documentId,
          pageId,
          scenarioId: data.scenarioId,
          scenarioName: data.scenarioName,
          appVersion: QUODSIM_VERSION
        },
        asynchronous: false
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
