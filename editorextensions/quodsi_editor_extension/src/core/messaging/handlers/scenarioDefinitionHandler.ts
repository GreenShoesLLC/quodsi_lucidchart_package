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

      // Sync scenarios to quodsi_api database (fire-and-forget). After
      // the server responds, apply any server-side id substitutions
      // (`replaced_id`) back into Lucid shape data so future syncs use
      // the canonical id. Substitutions happen when the server absorbed
      // a mismatched-id baseline into an existing one, or rewrote a
      // legacy zero-UUID baseline to a fresh UUID.
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
      }).then(async (result: any) => {
        console.log('[ScenarioDefinitionHandler] Scenarios synced to database');

        const responseData = result?.json ?? result;
        const substitutions = new Map<string, string>();
        for (const s of responseData?.scenarios ?? []) {
          if (s?.replaced_id && s?.id && s.replaced_id !== s.id) {
            substitutions.set(s.replaced_id, s.id);
          }
        }

        if (substitutions.size > 0) {
          const updated = data.scenarios.map(s =>
            substitutions.has(s.id) ? { ...s, id: substitutions.get(s.id)! } : s
          );
          await modelManager.updateScenarios(updated, currentPage);
          console.log(
            '[ScenarioDefinitionHandler] Applied server id substitutions:',
            Array.from(substitutions.entries())
          );
        }
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
