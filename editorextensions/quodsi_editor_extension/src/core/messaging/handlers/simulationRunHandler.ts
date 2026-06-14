import { EnvelopeBase, EnvelopeMessageType, ModelSerializerFactory, ModalSize, QUODSIM_VERSION, reduceModelToCatalog } from '@quodsi/lucid-shared';
import { DocumentProxy, Viewport } from 'lucid-extension-sdk';
import { router } from '../index';
import { PanelRole } from '../types';
import { ModelManager } from '../../ModelManager';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';
import { SimulationHandler } from './simulationHandler';
import { AuthHandler } from './authHandler';
import { ResultsModal } from '../../../panels/ResultsModal';
import { StudioEmbedModal } from '../../../panels/StudioEmbedModal';
import { upsertModelAndSyncScenarios, canonicalModelName } from '../../sync/scenarioSync';

/**
 * Handler for simulation run management messages
 */
export class SimulationRunHandler {
  private static logger = ExtensionDebugService.forComponent('SimulationRunHandler');

  /**
   * Cache of resolved server model ids, keyed by `${documentId}:${pageId}`.
   * UpsertModel re-resolves the same id every open; caching it lets reopens
   * skip the HTTP round-trip and open the modal immediately.
   */
  private static scenarioModelIdCache = new Map<string, string>();

  /**
   * Handle messages related to simulation run operations
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.SIMULATION_RUNS_LIST_REQUEST:
        // List operation pulls scenarios + nested runs
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

      case EnvelopeMessageType.OPEN_ANIMATION_MODAL:
        SimulationRunHandler.handleOpenAnimationModal(msg);
        return true;

      case EnvelopeMessageType.OPEN_SCENARIOS_MODAL:
        SimulationRunHandler.handleOpenScenariosModal(msg).catch((e) =>
          SimulationRunHandler.logger.error('handleOpenScenariosModal failed', e),
        );
        return true;

      case EnvelopeMessageType.OPEN_STUDIES_MODAL:
        SimulationRunHandler.handleOpenStudiesModal(msg).catch((e) =>
          SimulationRunHandler.logger.error('handleOpenStudiesModal failed', e),
        );
        return true;

      case EnvelopeMessageType.RUN_SCENARIO:
        SimulationRunHandler.handleRunScenario(msg).catch((e) =>
          SimulationRunHandler.logger.error('handleRunScenario failed', e),
        );
        return true;

      case EnvelopeMessageType.REQUEST_STUDIO_TOKEN:
        SimulationRunHandler.handleRequestStudioToken(msg).catch(error => {
          SimulationRunHandler.logger.error('Error in handleRequestStudioToken:', error);
        });
        return true;

      case EnvelopeMessageType.REQUEST_STUDIO_CATALOG:
        SimulationRunHandler.handleRequestStudioCatalog(msg).catch((e) =>
          SimulationRunHandler.logger.error('handleRequestStudioCatalog failed', e),
        );
        return true;

      // Not a simulation run message
      default:
        return false;
    }
  }

  /**
   * Determine which channel to send a response to based on the message source.
   * Messages from 'results-iframe' are routed to the 'results' channel,
   * messages from 'studio-embed-iframe' to 'studio-embed',
   * everything else goes to 'model'.
   */
  private static getResponseChannel(msg: EnvelopeBase): PanelRole {
    if (msg.source === 'results-iframe') return 'results';
    if (msg.source === 'studio-embed-iframe') return 'studio-embed';
    return 'model';
  }

  /**
   * Handle OPEN_RESULTS_MODAL: open StudioEmbedModal when useEmbeddedStudio is
   * true, otherwise fall back to the existing ResultsModal.
   */
  private static handleOpenResultsModal(msg: EnvelopeBase): void {
    const data = msg.data as { scenarioId: string; documentId: string; useEmbeddedStudio?: boolean; modalSize?: ModalSize };
    if (!data?.scenarioId) return;
    const client = ModelManager.getClient();
    if (data.useEmbeddedStudio) {
      SimulationRunHandler.logger.log('Opening embedded Studio results modal', { scenarioId: data.scenarioId });
      new StudioEmbedModal(client, {
        title: 'Simulation Results',
        studioPath: `/embed/scenarios/${data.scenarioId}/results`,
        modalSize: data.modalSize,
      }).show();
      return;
    }
    SimulationRunHandler.logger.log('Opening results modal', { scenarioId: data.scenarioId, documentId: data.documentId });
    new ResultsModal(client, data.scenarioId, data.documentId).show();
  }

  /**
   * Handle OPEN_ANIMATION_MODAL: open the embedded Studio animation viewer for
   * a scenario in the generic embed modal, with a "full screen" pop-out to the
   * standalone /animation/:scenarioId tab.
   */
  private static handleOpenAnimationModal(msg: EnvelopeBase): void {
    const data = msg.data as { scenarioId: string; modalSize?: ModalSize };
    if (!data?.scenarioId) return;
    SimulationRunHandler.logger.log('Opening embedded Studio animation modal', { scenarioId: data.scenarioId });
    const client = ModelManager.getClient();
    new StudioEmbedModal(client, {
      title: 'Animation',
      studioPath: `/embed/animation/${data.scenarioId}`,
      fullScreenPath: `/animation/${data.scenarioId}`,
      modalSize: data.modalSize,
    }).show();
  }

  /**
   * Shared embed-modal opener for the Scenarios/Studies surfaces: ensure the
   * model row exists in quodsi_api (UpsertModel) to resolve its server id, then
   * open the embedded Studio at /embed/models/<serverModelId>/<surface>.
   *
   * IMPORTANT: do NOT push Lucid shapeData scenarios here. Scenarios are
   * DB-authoritative once the embed owns them — the editor reads/writes
   * quodsi_api directly. SyncScenarios is replace-all, so pushing shapeData
   * (which lacks scenarios created in the embed) would soft-delete them.
   * Passing an empty list makes the helper skip SyncScenarios (UpsertModel only).
   */
  private static async openEmbedSurfaceModal(
    msg: EnvelopeBase, surface: 'scenarios' | 'studies', title: string,
  ): Promise<void> {
    const data = msg.data as { documentId?: string; pageId?: string; modalSize?: ModalSize };
    const client = ModelManager.getClient();
    const viewport = new Viewport(client);
    const page = viewport.getCurrentPage();
    if (!page || !data?.documentId || !data?.pageId) {
      SimulationRunHandler.logger.error(`OPEN_${surface.toUpperCase()}_MODAL: missing page/documentId/pageId`);
      return;
    }
    const cacheKey = `${data.documentId}:${data.pageId}`;
    const modelName = await canonicalModelName(ModelManager.getInstance());

    const openModal = (serverModelId: string): void => {
      new StudioEmbedModal(client, {
        title,
        studioPath: `/embed/models/${serverModelId}/${surface}`,
        modalSize: data.modalSize,
      }).show();
    };

    // Fire-and-forget upsert that keeps the DB row current and refreshes the cache.
    const refreshUpsert = (): Promise<string | null | undefined> =>
      upsertModelAndSyncScenarios(client, {
        documentId: data.documentId!,
        pageId: data.pageId!,
        modelName,
        scenarios: [],
      }).then(({ serverModelId }) => {
        if (serverModelId) SimulationRunHandler.scenarioModelIdCache.set(cacheKey, serverModelId);
        return serverModelId;
      });

    const cached = SimulationRunHandler.scenarioModelIdCache.get(cacheKey);
    if (cached) {
      // Reopen: open immediately with the cached id; keep the row fresh in the
      // background. The editor reads scenarios from quodsi_api anyway.
      openModal(cached);
      void refreshUpsert().catch((e) =>
        SimulationRunHandler.logger.error(`OPEN_${surface.toUpperCase()}_MODAL: background UpsertModel failed:`, e));
      return;
    }

    // First open: must resolve the id before we can build the studio path.
    const serverModelId = await refreshUpsert();
    if (!serverModelId) {
      SimulationRunHandler.logger.error(`OPEN_${surface.toUpperCase()}_MODAL: UpsertModel returned no model id`);
      return;
    }
    openModal(serverModelId);
  }

  /**
   * Handle OPEN_SCENARIOS_MODAL: open the embedded Studio scenarios editor at
   * /embed/models/<id>/scenarios. (Dormant — the panel button now opens Studies.)
   */
  private static async handleOpenScenariosModal(msg: EnvelopeBase): Promise<void> {
    return SimulationRunHandler.openEmbedSurfaceModal(msg, 'scenarios', 'Scenarios');
  }

  /**
   * Handle OPEN_STUDIES_MODAL: open the embedded Studio Studies surface at
   * /embed/models/<id>/studies.
   */
  private static async handleOpenStudiesModal(msg: EnvelopeBase): Promise<void> {
    return SimulationRunHandler.openEmbedSurfaceModal(msg, 'studies', 'Studies');
  }

  /**
   * Handle RUN_SCENARIO from the embedded Studio editor: delegate to the
   * existing live run path (Studio can't serialize the live model or produce
   * the page SVG). Awaits the outcome from handleRunRequest and relays a
   * RUN_SCENARIO_RESULT back to the embed iframe.
   */
  private static async handleRunScenario(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as { scenarioId?: string; enableAnimation?: boolean };
    if (!data?.scenarioId) {
      SimulationRunHandler.logger.error('RUN_SCENARIO: missing scenarioId');
      return;
    }
    const client = ModelManager.getClient();
    const documentId = new DocumentProxy(client).id;
    const outcome = await SimulationHandler.handleRunRequest({
      id: `run-scenario-${Date.now()}`,
      type: EnvelopeMessageType.MODEL_RUN_REQUEST,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: {
        documentId,
        scenarioDefinitionId: data.scenarioId,
        enableAnimation: data.enableAnimation ?? false,
        // Embed runs manage their own lifecycle (backend + Studio 10s poll); tell
        // handleRunRequest to skip the legacy in-memory activeJobs concurrency
        // tracker, which never terminalizes here and would wedge runs to one per
        // page refresh.
        fromEmbed: true,
      },
    });
    const channel = SimulationRunHandler.getResponseChannel(msg);
    router.send(channel, {
      id: `run-result-${Date.now()}`,
      type: EnvelopeMessageType.RUN_SCENARIO_RESULT,
      source: 'host',
      target: `${channel}-iframe`,
      version: '1.0',
      data: { scenarioId: data.scenarioId, accepted: outcome.accepted, error: outcome.error },
    });
  }

  /**
   * Handle REQUEST_STUDIO_TOKEN: relay a FRESH Kinde access token back to the
   * 'studio-embed' embed iframe. getTokenForRelay refreshes via Lucid when the
   * cached token is expiring, so the embed never receives a dead token (which
   * would 401 its scenario sync). Routing is derived from msg.source so a single
   * handler serves the channel.
   */
  private static async handleRequestStudioToken(msg: EnvelopeBase): Promise<void> {
    const token = await AuthHandler.getTokenForRelay();
    const channel = SimulationRunHandler.getResponseChannel(msg);
    SimulationRunHandler.logger.log('Relaying Studio token to embed iframe', { hasToken: !!token, channel });
    router.send(channel, {
      id: `msg-${Date.now()}`,
      type: EnvelopeMessageType.STUDIO_TOKEN,
      source: 'host',
      target: `${channel}-iframe`,
      version: '1.0',
      data: { token },
    });
  }

  /**
   * Handle REQUEST_STUDIO_CATALOG: serialize the live model, reduce it to a
   * read-only catalog, and send STUDIO_CATALOG back to the embed iframe.
   */
  private static async handleRequestStudioCatalog(msg: EnvelopeBase): Promise<void> {
    const modelManager = ModelManager.getInstance();
    const modelDefinition = await modelManager.getModelDefinition();
    if (!modelDefinition) {
      SimulationRunHandler.logger.error('REQUEST_STUDIO_CATALOG: no model definition available');
      return;
    }
    const serializer = ModelSerializerFactory.create(modelDefinition);
    const serializedModel = serializer.serialize(modelDefinition);
    const catalog = reduceModelToCatalog(serializedModel as unknown as Parameters<typeof reduceModelToCatalog>[0]);

    const channel = SimulationRunHandler.getResponseChannel(msg);
    router.send(channel, {
      id: `msg-${Date.now()}`,
      type: EnvelopeMessageType.STUDIO_CATALOG,
      source: 'host',
      target: `${channel}-iframe`,
      version: '1.0',
      data: { catalog },
    });
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

    const messageType = 'Simulation runs list';
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
