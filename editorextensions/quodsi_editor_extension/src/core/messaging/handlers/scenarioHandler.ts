import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { router } from '../index';
import { ModelManager } from '../../ModelManager';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';

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

}
