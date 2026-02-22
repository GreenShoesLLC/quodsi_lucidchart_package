import { EnvelopeBase, EnvelopeMessageType, ISerializedScenario } from '@quodsi/shared';
import { router } from '../index';
import { Viewport } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
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
