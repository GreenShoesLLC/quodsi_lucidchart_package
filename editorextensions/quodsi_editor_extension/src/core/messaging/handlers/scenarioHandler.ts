import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { router } from '../index';
import { ModelManager } from '../../ModelManager';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';
import { SimulationHandler } from './simulationHandler';

/**
 * Handler for scenario management messages
 */
export class ScenarioHandler {
  private static logger = ExtensionDebugService.forComponent('ScenarioHandler');

  /**
   * Handle messages related to scenario operations
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.SCENARIOS_LIST_REQUEST:
        // Handle async method - fire and forget, return true immediately
        ScenarioHandler.handleScenariosListRequest(msg).catch(error => {
          ScenarioHandler.logger.error('Error in handleScenariosListRequest:', error);
        });
        return true;

      case EnvelopeMessageType.SCENARIO_DELETE:
        // Handle async method - fire and forget, return true immediately
        ScenarioHandler.handleScenarioDelete(msg).catch(error => {
          ScenarioHandler.logger.error('Error in handleScenarioDelete:', error);
        });
        return true;

      case EnvelopeMessageType.CROSS_REP_DATA_REQUEST:
        // Handle async method - fire and forget, return true immediately
        ScenarioHandler.handleCrossRepDataRequest(msg).catch(error => {
          ScenarioHandler.logger.error('Error in handleCrossRepDataRequest:', error);
        });
        return true;

      case EnvelopeMessageType.SCENARIO_RESIMULATE_REQUEST:
        // Handle async method - fire and forget, return true immediately
        ScenarioHandler.handleResimulateRequest(msg).catch(error => {
          ScenarioHandler.logger.error('Error in handleResimulateRequest:', error);
        });
        return true;

      // Not a scenario message
      default:
        return false;
    }
  }

  /**
   * Handle scenarios list request
   *
   * @param msg SCENARIOS_LIST_REQUEST message
   */
  private static async handleScenariosListRequest(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as { documentId: string };

    ScenarioHandler.logger.log('Scenarios list requested', {
      documentId: data.documentId
    });

    try {
      // Get the EditorClient
      const client = ModelManager.getClient();

      ScenarioHandler.logger.log('Calling data connector ListScenarios action...');

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
      ScenarioHandler.logger.log('ListScenarios raw result type:', typeof result);
      ScenarioHandler.logger.log('ListScenarios raw result:', JSON.stringify(result, null, 2));
      ScenarioHandler.logger.log('result.json exists?', !!result?.json);
      ScenarioHandler.logger.log('result.json.scenarios exists?', !!result?.json?.scenarios);

      // Extract the actual data from the Lucid SDK wrapper
      const responseData = result.json || result;

      ScenarioHandler.logger.log('ListScenarios action completed successfully', {
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
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.SCENARIOS_LIST_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: responseData
      });

    } catch (error) {
      ScenarioHandler.logger.error('Error listing scenarios:', error);

      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.ERROR,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          code: 'SCENARIOS_LIST_FAILED',
          message: error instanceof Error ? error.message : String(error),
          relatedTo: EnvelopeMessageType.SCENARIOS_LIST_REQUEST
        }
      });
    }
  }

  /**
   * Handle scenario deletion request
   *
   * @param msg SCENARIO_DELETE message
   */
  private static async handleScenarioDelete(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as { documentId: string; scenarioId: string };

    ScenarioHandler.logger.log('Scenario deletion requested', {
      documentId: data.documentId,
      scenarioId: data.scenarioId
    });

    try {
      // Get the EditorClient
      const client = ModelManager.getClient();

      ScenarioHandler.logger.log('Calling data connector DeleteScenario action...');

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

      ScenarioHandler.logger.log('DeleteScenario action completed', {
        success: responseData?.success,
        documentId: data.documentId,
        scenarioId: data.scenarioId
      });

      // Clean up any active simulation jobs for this scenario
      if (responseData?.success) {
        ScenarioHandler.logger.log('Cleaning up job tracking for deleted scenario');
        SimulationHandler.stopPollingForScenario(data.scenarioId);
      }

      // Send success response
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.SCENARIO_DELETE_RESULT,
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
      ScenarioHandler.logger.error('Error deleting scenario:', error);

      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.SCENARIO_DELETE_RESULT,
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
      dataType: 'activity' | 'entity' | 'resource' | 'activity-contents-timeseries' | 'state-summary' | 'activity-input-buffer-timeseries' | 'activity-output-buffer-timeseries'
    };

    ScenarioHandler.logger.log('Cross-rep data requested', {
      documentId: data.documentId,
      scenarioId: data.scenarioId,
      dataType: data.dataType
    });

    try {
      // Get the EditorClient
      const client = ModelManager.getClient();

      // Map data type to action name
      const actionMap = {
        activity: 'GetActivityCrossRepData',
        entity: 'GetEntityCrossRepData',
        resource: 'GetResourceCrossRepData',
        'activity-contents-timeseries': 'GetActivityContentsTimeseries',
        'activity-input-buffer-timeseries': 'GetActivityInputBufferTimeseries',
        'activity-output-buffer-timeseries': 'GetActivityOutputBufferTimeseries',
        'state-summary': 'GetStateSummary'
      };

      const actionName = actionMap[data.dataType];

      ScenarioHandler.logger.log(`Calling data connector ${actionName} action...`);

      // Call the data connector to fetch cross-rep data
      const result = await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_data_connector',
        actionName: actionName,
        actionData: {
          documentId: data.documentId,
          scenarioId: data.scenarioId
        },
        asynchronous: true
      });

      // Extract the actual data from the Lucid SDK wrapper
      const responseData = result.json || result;

      ScenarioHandler.logger.log(`${actionName} action completed successfully`, {
        success: responseData?.success,
        recordCount: responseData?.recordCount || responseData?.data?.length || 0
      });

      // Send success response with the unwrapped data and include dataType
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.CROSS_REP_DATA_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          ...responseData,
          dataType: data.dataType // Include dataType so React knows which data this is
        }
      });

    } catch (error) {
      ScenarioHandler.logger.error('Error fetching cross-rep data:', error);

      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.ERROR,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          code: 'CROSS_REP_DATA_FAILED',
          message: error instanceof Error ? error.message : String(error),
          relatedTo: EnvelopeMessageType.CROSS_REP_DATA_REQUEST,
          dataType: data.dataType
        }
      });
    }
  }

  /**
   * Handle scenario resimulate request
   *
   * @param msg SCENARIO_RESIMULATE_REQUEST message
   */
  private static async handleResimulateRequest(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as { documentId: string; scenarioId: string; scenarioName: string };

    ScenarioHandler.logger.log('Scenario resimulate requested', {
      documentId: data.documentId,
      scenarioId: data.scenarioId,
      scenarioName: data.scenarioName
    });

    try {
      // Get the EditorClient
      const client = ModelManager.getClient();

      ScenarioHandler.logger.log('Calling data connector SubmitSimulationJob action...');

      // Call the data connector to submit simulation job (reuses existing model.json)
      const result = await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_data_connector',
        actionName: 'SubmitSimulationJob',
        actionData: {
          documentId: data.documentId,
          scenarioId: data.scenarioId,
          scenarioName: data.scenarioName,
          appVersion: '2.0'
        },
        asynchronous: true
      });

      // Extract the actual data from the Lucid SDK wrapper
      const responseData = result.json || result;

      ScenarioHandler.logger.log('SubmitSimulationJob action completed', {
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
      ScenarioHandler.logger.error('Error resimulating scenario:', error);

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
