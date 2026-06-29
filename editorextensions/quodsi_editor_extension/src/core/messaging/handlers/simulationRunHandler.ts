import { EnvelopeBase, EnvelopeMessageType, ModelSerializerFactory, ModalSize, buildRelayConnectors } from '@quodsi/lucid-shared';
import type { ISerializedModel } from '@quodsi/lucid-shared';
import { DocumentProxy, ItemProxy, Viewport } from 'lucid-extension-sdk';
import { router } from '../index';
import { PanelRole } from '../types';
import { ModelManager } from '../../ModelManager';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';
import { SimulationHandler } from './simulationHandler';
import { AuthHandler } from './authHandler';
import { StudioEmbedModal } from '../../../panels/StudioEmbedModal';
import { upsertModel, canonicalModelName, pushModelDefinitionSnapshot } from '../../sync/scenarioSync';

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
   * Context for the most recent pending (uncached) embed open: the surface and
   * the in-flight UpsertModel promise. The embed view pulls the resolved path
   * via REQUEST_STUDIO_EMBED_PATH, which awaits this promise. One studio-embed
   * modal is open at a time, so a single slot suffices.
   */
  private static pendingEmbedResolve:
    | { surface: 'studies' | 'diagram-mapping'; idPromise: Promise<string | null | undefined> }
    | null = null;

  /**
   * Handle messages related to simulation run operations
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.OPEN_STUDIES_MODAL:
        SimulationRunHandler.handleOpenStudiesModal(msg).catch((e) =>
          SimulationRunHandler.logger.error('handleOpenStudiesModal failed', e),
        );
        return true;

      case EnvelopeMessageType.OPEN_DIAGRAM_MAPPING_MODAL:
        SimulationRunHandler.handleOpenDiagramMappingModal(msg).catch((e) =>
          SimulationRunHandler.logger.error('handleOpenDiagramMappingModal failed', e),
        );
        return true;

      case EnvelopeMessageType.RUN_SCENARIO:
        SimulationRunHandler.handleRunScenario(msg).catch((e) =>
          SimulationRunHandler.logger.error('handleRunScenario failed', e),
        );
        return true;

      case EnvelopeMessageType.LOCATE_ELEMENT:
        SimulationRunHandler.handleLocateElement(msg).catch((e) =>
          SimulationRunHandler.logger.error('handleLocateElement failed', e),
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

      case EnvelopeMessageType.REQUEST_STUDIO_EMBED_PATH:
        SimulationRunHandler.handleRequestStudioEmbedPath(msg).catch((e) =>
          SimulationRunHandler.logger.error('handleRequestStudioEmbedPath failed', e),
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
   * Shared embed-modal opener for the Studies surfaces: ensure the
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
    msg: EnvelopeBase, surface: 'studies' | 'diagram-mapping', title: string,
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
      upsertModel(client, {
        documentId: data.documentId!,
        pageId: data.pageId!,
        modelName,
      }).then(({ serverModelId }) => {
        if (serverModelId) SimulationRunHandler.scenarioModelIdCache.set(cacheKey, serverModelId);
        return serverModelId;
      });

    // For the Studies surface only, push the live model definition snapshot
    // (envelope-level modelDefinitionSnapshot → models.model_definition_snapshot)
    // fire-and-forget AFTER the modal opens — never block the Studies button on
    // the serialize+sync.
    const pushSnapshotIfStudies = (): void => {
      if (surface !== 'studies') return;
      void pushModelDefinitionSnapshot(client, { documentId: data.documentId!, pageId: data.pageId!, modelName })
        .catch((e) => SimulationRunHandler.logger.error('OPEN_STUDIES_MODAL: snapshot push failed', e));
    };

    const cached = SimulationRunHandler.scenarioModelIdCache.get(cacheKey);
    if (cached) {
      // Reopen: open immediately with the cached id; keep the row fresh in the
      // background. The editor reads scenarios from quodsi_api anyway.
      openModal(cached);
      pushSnapshotIfStudies();
      void refreshUpsert().catch((e) =>
        SimulationRunHandler.logger.error(`OPEN_${surface.toUpperCase()}_MODAL: background UpsertModel failed:`, e));
      return;
    }

    // First (uncached) open: DON'T block the modal on UpsertModel. Open the modal
    // INSTANTLY in a pending state, resolve the server model id in the background,
    // and hand it to the embed view when it pulls REQUEST_STUDIO_EMBED_PATH. The
    // upsert runs concurrently with the iframe + quodsim-react boot, so by the
    // time the view asks, the id is usually already resolved.
    const idPromise = refreshUpsert();
    idPromise.catch((e) => // never let it become an unhandled rejection
      SimulationRunHandler.logger.error(`OPEN_${surface.toUpperCase()}_MODAL: UpsertModel failed:`, e));
    SimulationRunHandler.pendingEmbedResolve = { surface, idPromise };
    new StudioEmbedModal(client, { title, pending: true, modalSize: data.modalSize }).show();
    pushSnapshotIfStudies();
  }

  /**
   * Handle REQUEST_STUDIO_EMBED_PATH: the embed view (opened in pending mode)
   * pulls the resolved studio path once its channel has registered. Await the
   * in-flight UpsertModel, then reply STUDIO_EMBED_PATH with
   * /embed/models/<id>/<surface> (or an error). Pull (not push) sidesteps the
   * channel-registration race that drops messages sent before the view is ready.
   */
  private static async handleRequestStudioEmbedPath(msg: EnvelopeBase): Promise<void> {
    const ctx = SimulationRunHandler.pendingEmbedResolve;
    const channel = SimulationRunHandler.getResponseChannel(msg);
    let studioPath: string | null = null;
    let error: string | undefined;
    if (!ctx) {
      error = 'no pending embed open';
    } else {
      try {
        const id = await ctx.idPromise;
        if (id) studioPath = `/embed/models/${id}/${ctx.surface}`;
        else error = 'model id unresolved';
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
    }
    router.send(channel, {
      id: `msg-${Date.now()}`,
      type: EnvelopeMessageType.STUDIO_EMBED_PATH,
      source: 'host',
      target: `${channel}-iframe`,
      version: '1.0',
      data: { studioPath, error },
    });
  }

  /**
   * Handle OPEN_STUDIES_MODAL: open the embedded Studio Studies surface at
   * /embed/models/<id>/studies.
   */
  private static async handleOpenStudiesModal(msg: EnvelopeBase): Promise<void> {
    return SimulationRunHandler.openEmbedSurfaceModal(msg, 'studies', 'Studies');
  }

  /**
   * Handle OPEN_DIAGRAM_MAPPING_MODAL: open the embedded Studio Diagram Mapping
   * surface at /embed/models/<id>/diagram-mapping.
   */
  private static async handleOpenDiagramMappingModal(msg: EnvelopeBase): Promise<void> {
    return SimulationRunHandler.openEmbedSurfaceModal(msg, 'diagram-mapping', 'Diagram Mapping');
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
   * Handle LOCATE_ELEMENT from the embedded Studio iframe: select the
   * corresponding block or line on the Lucid canvas so the user can see it.
   */
  private static async handleLocateElement(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as { elementId?: string };
    if (!data?.elementId) {
      SimulationRunHandler.logger.error('LOCATE_ELEMENT: missing elementId');
      return;
    }
    const { elementId } = data;
    try {
      const client = ModelManager.getClient();
      const proxy = ModelManager.getInstance().findElementProxy(elementId);
      if (!proxy) {
        SimulationRunHandler.logger.error('LOCATE_ELEMENT: element not found', { elementId });
        return;
      }
      const viewport = new Viewport(client);
      // BlockProxy and LineProxy both extend ItemProxy; findElementProxy returns
      // ElementProxy (the common base), so we cast to the narrower ItemProxy type
      // that setSelectedItems expects.
      viewport.setSelectedItems([proxy as ItemProxy]);
      // Pan and zoom the canvas so the selected shape is visible. focusCameraOnItems
      // also handles page-switching if the shape is on a different page.
      viewport.focusCameraOnItems([proxy as ItemProxy]);
      SimulationRunHandler.logger.log('LOCATE_ELEMENT: selected element', { elementId });
    } catch (e) {
      SimulationRunHandler.logger.error('LOCATE_ELEMENT: error selecting element', e);
    }
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
   * Handle REQUEST_STUDIO_CATALOG: serialize the live model, build the full
   * model catalog (model block + per-record fields), and send STUDIO_CATALOG
   * back to the embed iframe for validation.
   */
  private static async handleRequestStudioCatalog(msg: EnvelopeBase): Promise<void> {
    const modelManager = ModelManager.getInstance();
    const modelDefinition = await modelManager.getModelDefinition();
    if (!modelDefinition) {
      SimulationRunHandler.logger.error('REQUEST_STUDIO_CATALOG: no model definition available');
      return;
    }
    const serializer = ModelSerializerFactory.create(modelDefinition);
    const serializedModel = serializer.serialize(modelDefinition) as ISerializedModel;
    const catalog = SimulationRunHandler.buildStudioCatalog(serializedModel);

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
   * Build the full relay catalog from a serialized model. Populates the `model`
   * block (timing fields) and all per-record optional fields (capacity, weight,
   * generationConfig, rootClauses, etc.) so the embedded Studio can validate the
   * full model without a separate API round-trip.
   *
   * The returned shape is structurally compatible with
   * `quodsi_studio/src/platforms/lucid-embed/relayProtocol.ts#RelayedCatalog`.
   * Connectors are flattened from activity.connectors into a top-level array
   * (deduplicated by id) and carry sourceId/targetId/weight.
   */
  private static buildStudioCatalog(model: ISerializedModel) {
    const m = model.model;

    // Flatten + deduplicate connectors from all activities AND synthesize
    // generator exit connectors (ISerializedGenerator.exitConnector is only a
    // bare target activity id, not a full connector object — buildRelayConnectors
    // adds synthetic entries so the embed's validation finds the connectivity).
    const connectors = buildRelayConnectors(model);

    return {
      model: {
        id: m.id,
        name: m.name,
        simulationTimeType: m.simulationTimeType,
        runClockPeriod: m.runClockPeriod,
        startDateTime: m.startDateTime ?? null,
        finishDateTime: m.finishDateTime ?? null,
        // Opt-in model-level levers (reps/seed) so the live-relay embed path
        // surfaces them in the New-Study roster (the receiver — RelayedCatalog.
        // model.levers + composeModelDefinition — is already wired).
        levers: m.levers ?? [],
      },
      activities: (model.activities ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        capacity: a.capacity,
        inboundQueueCapacity: a.inboundQueueCapacity,
        outboundQueueCapacity: a.outboundQueueCapacity,
        connectType: a.connectType,
        actions: (a.actions ?? []).map((ac) => {
          const base: {
            id: string;
            actionType: string;
            duration?: unknown;
            resourceRequirementId?: string | null;
          } = { id: ac.id ?? '', actionType: ac.actionType };
          if ('duration' in ac) base.duration = (ac as { duration?: unknown }).duration;
          if ('resourceRequirementId' in ac) {
            base.resourceRequirementId = (ac as { resourceRequirementId?: string | null }).resourceRequirementId ?? null;
          }
          return base;
        }),
      })),
      resources: (model.resources ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
      })),
      resourceRequirements: (model.resourceRequirements ?? []).map((rq) => ({
        id: rq.id,
        name: rq.name,
        rootClauses: rq.rootClauses,
      })),
      generators: (model.generators ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        generationConfig: g.generationConfig
          ? {
              entityId: g.generationConfig.entityId,
              entitiesPerCreation: g.generationConfig.entitiesPerCreation,
              periodicOccurrences: g.generationConfig.periodicOccurrences,
              maxEntities: g.generationConfig.maxEntities,
              periodIntervalDuration: g.generationConfig.periodIntervalDuration,
              periodicStartDuration: g.generationConfig.periodicStartDuration,
              generatorType: g.generationConfig.generatorType,
            }
          : undefined,
      })),
      connectors,
      entities: (model.entities ?? []).map((e) => ({ id: e.id, name: e.name })),
    };
  }

}
