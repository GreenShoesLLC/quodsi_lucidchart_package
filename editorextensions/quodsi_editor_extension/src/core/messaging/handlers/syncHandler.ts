import {
  EnvelopeBase,
  EnvelopeMessageType,
  ISerializedScenario,
  SyncAllErrorData,
  SyncAllRequestData,
} from '@quodsi/shared';
import { Viewport } from 'lucid-extension-sdk';
import { router } from '../index';
import { PanelRole } from '../types';
import { ModelManager } from '../../ModelManager';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';
import { SimulationHandler } from './simulationHandler';
import { SimulationRunHandler } from './simulationRunHandler';

/**
 * Handler for SYNC_ALL_REQUEST. Orchestrates UpsertModel → SyncScenarios →
 * ListScenarios sequentially against quodsi_api. Emits SYNC_ALL_SUCCESS or
 * SYNC_ALL_ERROR with timing/counts, and also re-broadcasts the freshly
 * pulled scenarios + nested runs as SIMULATION_RUNS_LIST_RESULT so existing
 * React reducers update without any extra plumbing.
 *
 * Sequencing rationale:
 *   - UpsertModel first: SyncScenarios requires the model row to exist
 *   - SyncScenarios second: server-side scenarios state must reflect local
 *     intent before the read step returns the canonical view
 *   - ListScenarios third: returns the combined scenarios+runs payload
 *     (the backend nests runs under each scenario, so no separate
 *     ListSimulationRuns action is needed)
 *
 * Note on the SyncAllErrorData step union: the shared types include
 * `listSimulationRuns` for symmetry with the React plan, but on this
 * backend the runs come bundled inside the ListScenarios response, so the
 * read step reports as `listScenarios`.
 */
export class SyncHandler {
  private static logger = ExtensionDebugService.forComponent('SyncHandler');

  public static handleMessage(msg: EnvelopeBase): boolean {
    if (msg.type !== EnvelopeMessageType.SYNC_ALL_REQUEST) {
      return false;
    }
    SyncHandler.handleSyncAllRequest(msg).catch(error => {
      SyncHandler.logger.error('Unhandled error in handleSyncAllRequest:', error);
    });
    return true;
  }

  /**
   * Determine which channel to send a response to based on the message source.
   * Mirrors SimulationRunHandler.getResponseChannel.
   */
  private static getResponseChannel(msg: EnvelopeBase): PanelRole {
    if (msg.source === 'results-iframe') return 'results';
    if (msg.source === 'studio-results-iframe') return 'studio-results';
    return 'model';
  }

  private static async handleSyncAllRequest(msg: EnvelopeBase): Promise<void> {
    const startedAt = Date.now();
    const data = msg.data as SyncAllRequestData;
    const responseChannel = SyncHandler.getResponseChannel(msg);

    let step: SyncAllErrorData['step'] = 'upsertModel';

    SyncHandler.logger.log('SYNC_ALL requested', {
      documentId: data.documentId,
      pageId: data.pageId,
      modelName: data.modelName,
      scenariosCount: data.scenarios?.length ?? 0,
    });

    try {
      const client = ModelManager.getClient();

      // Step 1: UpsertModel — ensure server has a model row before scenarios sync.
      step = 'upsertModel';
      SyncHandler.logger.log('Calling UpsertModel...');
      await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'UpsertModel',
        actionData: {
          documentId: data.documentId,
          pageId: data.pageId,
          modelName: data.modelName,
        },
        asynchronous: false,
      });

      // Step 2: SyncScenarios — push local scenarios to server, capturing any
      // server-side id substitutions to re-write into Lucid shape data
      // (matches the pattern in ScenarioDefinitionHandler / RightDockPanel).
      step = 'syncScenarios';
      SyncHandler.logger.log('Calling SyncScenarios...', {
        scenariosCount: data.scenarios?.length ?? 0,
      });
      const syncResult = (await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'SyncScenarios',
        actionData: {
          documentId: data.documentId,
          pageId: data.pageId,
          scenarios: data.scenarios ?? [],
        },
        asynchronous: false,
      })) as { json?: { scenarios?: Array<{ id?: string; replaced_id?: string }> } };

      const syncResponseData = syncResult?.json ?? (syncResult as any);
      const substitutions = new Map<string, string>();
      for (const s of syncResponseData?.scenarios ?? []) {
        if (s?.replaced_id && s?.id && s.replaced_id !== s.id) {
          substitutions.set(s.replaced_id, s.id);
        }
      }
      if (substitutions.size > 0) {
        try {
          const viewport = new Viewport(client);
          const currentPage = viewport.getCurrentPage();
          if (currentPage) {
            const modelManager = ModelManager.getInstance();
            const updated: ISerializedScenario[] = (data.scenarios ?? []).map(s =>
              substitutions.has(s.id) ? { ...s, id: substitutions.get(s.id)! } : s
            );
            await modelManager.updateScenarios(updated, currentPage);
            SyncHandler.logger.log('Applied server id substitutions:', {
              count: substitutions.size,
            });
          }
        } catch (subErr) {
          // Substitution failures are non-fatal — the data is already on the
          // server. Log and continue so the read step still runs.
          SyncHandler.logger.error('Failed to apply id substitutions (non-fatal):', subErr);
        }
      }

      // Step 3: ListScenarios — pull canonical scenarios + nested runs back.
      // The backend bundles runs inside the scenarios response, so this single
      // call replaces what would otherwise be parallel ListScenarios +
      // ListSimulationRuns reads.
      step = 'listScenarios';
      SyncHandler.logger.log('Calling ListScenarios...');
      const listResult = await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'ListScenarios',
        actionData: {
          documentId: data.documentId,
          pageId: data.pageId,
        },
        asynchronous: false,
      });
      const listResponseData = listResult?.json ?? listResult;
      const flatScenarios = listResponseData?.scenarios
        ? SimulationRunHandler.transformToFlatScenarioList(listResponseData.scenarios)
        : [];
      const runsCount = (listResponseData?.scenarios ?? []).reduce(
        (acc: number, s: any) => acc + (s.runs?.length ?? 0),
        0
      );

      // Reconcile active simulation jobs with the scenario list, matching
      // SimulationRunHandler.handleSimulationRunsListRequest.
      if (flatScenarios.length > 0) {
        SimulationHandler.reconcileWithScenarioList(data.documentId, flatScenarios);
      }

      const durationMs = Date.now() - startedAt;
      SyncHandler.logger.log('SYNC_ALL succeeded', {
        documentId: data.documentId,
        scenariosCount: flatScenarios.length,
        runsCount,
        durationMs,
      });

      // SUCCESS envelope: timing + counts for the React sync slice.
      router.send(responseChannel, {
        id: msg.id,
        type: EnvelopeMessageType.SYNC_ALL_SUCCESS,
        source: 'host',
        target: `${responseChannel}-iframe`,
        version: '1.0',
        data: {
          documentId: data.documentId,
          pageId: data.pageId,
          scenariosCount: flatScenarios.length,
          runsCount,
          durationMs,
        },
      });

      // Re-broadcast the freshly pulled scenarios+runs in the same shape the
      // simulation-runs-list reducer already understands. No new envelope
      // type required — SIMULATION_RUNS_LIST_RESULT carries both scenarios
      // and their nested runs in this codebase.
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
          generatedAt: listResponseData?.generatedAt || new Date().toISOString(),
        },
      });

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      SyncHandler.logger.error(`SYNC_ALL failed at step=${step}`, { errMsg });

      router.send(responseChannel, {
        id: msg.id,
        type: EnvelopeMessageType.SYNC_ALL_ERROR,
        source: 'host',
        target: `${responseChannel}-iframe`,
        version: '1.0',
        data: {
          documentId: data.documentId,
          pageId: data.pageId,
          step,
          error: errMsg,
        },
      });
    }
  }
}
