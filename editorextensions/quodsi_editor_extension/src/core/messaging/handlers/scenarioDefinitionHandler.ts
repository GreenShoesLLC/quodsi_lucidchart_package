import { EnvelopeBase, EnvelopeMessageType, ISerializedScenario } from '@quodsi/shared';
import { router } from '../index';
import { Viewport, DocumentProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
import { SelectionHandler } from './selection/SelectionHandler';

/**
 * Handler for scenario definition operations (update scenarios array in shapeData)
 */
export class ScenarioDefinitionHandler {
  /**
   * Handle messages related to scenario definition operations
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.SCENARIOS_DEFINITION_UPDATE:
        ScenarioDefinitionHandler.handleScenariosUpdate(msg)
          .catch(err => console.error('[ScenarioDefinitionHandler] Error in handleScenariosUpdate:', err));
        return true;

      case EnvelopeMessageType.SCENARIOS_DEFINITION_RESULT:
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle scenarios definition update request
   */
  private static async handleScenariosUpdate(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as {
      scenarios: ISerializedScenario[];
    };

    console.log('[ScenarioDefinitionHandler] Scenarios update requested', {
      scenariosCount: data.scenarios.length
    });

    try {
      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();

      const viewport = new Viewport(client);
      const currentPage = viewport.getCurrentPage();
      if (!currentPage) {
        throw new Error('Current page not available');
      }

      await modelManager.updateScenarios(data.scenarios, currentPage);
      await modelManager.validateModel();
      await SelectionHandler.sendSelectionChangedMessage(true);

      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.SCENARIOS_DEFINITION_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true
        }
      });

      // Sync scenarios to quodsi_api database (fire-and-forget)
      const document = new DocumentProxy(client);
      LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'SyncScenarios',
        actionData: {
          documentId: document.id,
          pageId: currentPage.id,
          scenarios: data.scenarios
        },
        asynchronous: false
      }).then(() => {
        console.log('[ScenarioDefinitionHandler] Scenarios synced to database');
      }).catch(err => {
        console.error('[ScenarioDefinitionHandler] Failed to sync scenarios to database:', err);
      });

      return true;

    } catch (error) {
      console.error('[ScenarioDefinitionHandler] Error updating scenarios', error);

      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.SCENARIOS_DEFINITION_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });

      return false;
    }
  }
}
