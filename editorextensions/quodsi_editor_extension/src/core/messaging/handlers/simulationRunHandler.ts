import { EnvelopeBase, EnvelopeMessageType, modelDefinitionToCleanDocument, ModalSize, buildRelayedCatalog } from '@quodsi/lucid-shared';
import { DocumentProxy, ItemProxy, Viewport } from 'lucid-extension-sdk';
import { router } from '../index';
import { PanelRole } from '../types';
import { ModelManager } from '../../ModelManager';
import { getLogger } from '@quodsi/lucid-shared';
import { SimulationHandler } from './simulationHandler';
import { AuthHandler } from './authHandler';
import { StudiesModal } from '../../../panels/StudiesModal';
import { AdvisorConsultModal } from '../../../panels/AdvisorConsultModal';
import { DiagramMappingModal } from '../../../panels/DiagramMappingModal';
import { upsertModel, canonicalModelName, pushModelDefinitionSnapshot } from '../../sync/scenarioSync';

/**
 * Handler for simulation run management messages
 */
export class SimulationRunHandler {
  private static logger = getLogger('SimulationRunHandler');

  /**
   * Cache of resolved server model ids, keyed by `${documentId}:${pageId}`.
   * UpsertModel re-resolves the same id every open; caching it lets reopens
   * skip the HTTP round-trip and open the modal immediately.
   */
  private static scenarioModelIdCache = new Map<string, string>();

  /** The most recent Studies open: resolves to the server model id once the
   *  upsert AND the snapshot push are done; rejects with the failure. The
   *  Studies view pulls the outcome via REQUEST_STUDIO_EMBED_PATH. One
   *  studio-embed modal is open at a time, so a single slot suffices. */
  private static studiesSync: { promise: Promise<string>; cachedModelId?: string } | null = null;

  /**
   * The diagram-mapping modal currently open, if any. SINGLETON GUARD, same
   * shape as ModelRootHandler.handleOpenPatternModal/handleOpenSettingsModal
   * (see that file's own comment for the full rationale): hold the open
   * modal, refuse a second open, release on frameClosed, identity-checked so
   * a late frameClosed from an earlier modal cannot clear a newer one's
   * claim. Unlike the Studies modal above, opening this modal has no
   * server round trip in the way at all (no UpsertModel), so a double-click
   * would otherwise open two modals just as readily as the pattern/schedule
   * editors did before they got the same guard.
   */
  private static openDiagramMappingModal: DiagramMappingModal | null = null;

  /**
   * Handle messages related to simulation run operations
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      // OPEN_PATTERN_MODAL is NOT handled here -- it lives in
      // modelRootHandler.ts. Unlike OPEN_STUDIES_MODAL below, it opens a
      // local quodsim-react view (no server-side model id to resolve via
      // UpsertModel), and modelRootHandler.ts is where the arrivalPatterns
      // model-root projection it edits is otherwise read/written.
      // OPEN_DIAGRAM_MAPPING_MODAL below is ALSO local now (spec 2026-09-15,
      // "opens inline") but stays in this file rather than moving to
      // modelRootHandler.ts: it has no model-root projection of its own, and
      // the relay handler it talks to (DiagramMappingRelayHandler) already
      // lives alongside this class.
      case EnvelopeMessageType.OPEN_STUDIES_MODAL:
        SimulationRunHandler.handleOpenStudiesModal(msg).catch((e) =>
          SimulationRunHandler.logger.error('handleOpenStudiesModal failed', e),
        );
        return true;

      case EnvelopeMessageType.OPEN_DIAGRAM_MAPPING_MODAL:
        SimulationRunHandler.handleOpenDiagramMappingModal(msg);
        return true;

      case EnvelopeMessageType.OPEN_ADVISOR_MODAL:
        SimulationRunHandler.handleOpenAdvisorModal(msg);
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
   * Handle OPEN_STUDIES_MODAL: open the compiled Studies surface
   * (quodsim-react ?view=studies, StudiesModal) at once, and sync the model in
   * the background: UpsertModel (ensures the quodsi_api row exists and
   * resolves its server id) AND the model-definition snapshot push. The view
   * pulls the outcome via REQUEST_STUDIO_EMBED_PATH.
   *
   * The modal opens before any network wait -- only canonicalModelName
   * precedes it. A cached server id (earlier open of the same page) rides on
   * the modal URL so the view can start loading immediately; the reply still
   * waits for this open's snapshot push.
   *
   * Diagram Mapping used to share this path until it moved inline (spec
   * 2026-09-15, "opens inline") -- see DiagramMappingModal.ts's header.
   *
   * IMPORTANT: do NOT push Lucid shapeData scenarios here. Scenarios are
   * DB-authoritative once the Studies surface owns them -- it reads/writes
   * quodsi_api directly. SyncScenarios is replace-all, so pushing shapeData
   * (which lacks scenarios created in the Studies surface) would soft-delete
   * them. upsertModel passes an empty list, so the helper skips SyncScenarios
   * (UpsertModel only).
   */
  private static async handleOpenStudiesModal(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as { documentId?: string; pageId?: string; modalSize?: ModalSize };
    const client = ModelManager.getClient();
    const viewport = new Viewport(client);
    const page = viewport.getCurrentPage();
    if (!page || !data?.documentId || !data?.pageId) {
      SimulationRunHandler.logger.error('OPEN_STUDIES_MODAL: missing page/documentId/pageId');
      return;
    }
    const cacheKey = `${data.documentId}:${data.pageId}`;
    const modelName = await canonicalModelName(ModelManager.getInstance());

    // Upsert that keeps the DB row current and refreshes the id cache.
    const refreshUpsert = (): Promise<string | null | undefined> =>
      upsertModel(client, {
        documentId: data.documentId!,
        pageId: data.pageId!,
        modelName,
      }).then(({ serverModelId }) => {
        if (serverModelId) SimulationRunHandler.scenarioModelIdCache.set(cacheKey, serverModelId);
        return serverModelId;
      });

    const cached = SimulationRunHandler.scenarioModelIdCache.get(cacheKey);
    new StudiesModal(client, { modelId: cached, modalSize: data.modalSize }).show();
    const idPromise = refreshUpsert();
    // Push the live model definition snapshot (envelope-level
    // modelDefinitionSnapshot -> models.model_definition_snapshot) AFTER the
    // modal opens -- never block the Studies button on the serialize+sync.
    const snapshotPromise = pushModelDefinitionSnapshot(client, {
      documentId: data.documentId!,
      pageId: data.pageId!,
      modelName,
    });
    const promise = Promise.all([idPromise, snapshotPromise]).then(([id]) => {
      const resolved = id ?? cached;
      if (!resolved) throw new Error('model id unresolved');
      return resolved;
    });
    // Never let it become an unhandled rejection; the view receives the error
    // through REQUEST_STUDIO_EMBED_PATH.
    promise.catch((e) => SimulationRunHandler.logger.error('OPEN_STUDIES_MODAL: sync failed', e));
    SimulationRunHandler.studiesSync = { promise, cachedModelId: cached };
  }

  /**
   * Handle REQUEST_STUDIO_EMBED_PATH: the Studies view pulls the outcome of
   * the most recent open's sync once its channel has registered. Replies
   * STUDIO_EMBED_PATH { modelId?, synced, error? } after both the upsert and
   * the snapshot push settle. On failure the cached id (if any) still rides
   * along. Pull (not push) sidesteps the channel-registration race that drops
   * messages sent before the view is ready.
   */
  private static async handleRequestStudioEmbedPath(msg: EnvelopeBase): Promise<void> {
    const channel = SimulationRunHandler.getResponseChannel(msg);
    const sync = SimulationRunHandler.studiesSync;
    let data: { modelId?: string; synced: boolean; error?: string };
    if (!sync) {
      data = { synced: false, error: 'no pending Studies open' };
    } else {
      try {
        data = { modelId: await sync.promise, synced: true };
      } catch (e) {
        data = { modelId: sync.cachedModelId, synced: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
    router.send(channel, {
      id: `msg-${Date.now()}`,
      type: EnvelopeMessageType.STUDIO_EMBED_PATH,
      source: 'host',
      target: `${channel}-iframe`,
      version: '1.0',
      data,
    });
  }

  /**
   * Handle OPEN_DIAGRAM_MAPPING_MODAL: open the Diagram Mapping screen
   * inline, in the extension's own quodsim-react bundle (spec 2026-09-15,
   * "opens inline") — see DiagramMappingModal.ts's header for why this no
   * longer goes through a Studio embed. There is no server round trip
   * in the way, so the modal opens synchronously and immediately, guarded
   * against a double-open the same way ModelRootHandler's pattern/schedule/
   * work-schedule/settings modals are (see openDiagramMappingModal's own
   * comment). The payload is just the window-size preference; the modal
   * reads the current page itself.
   */
  private static handleOpenDiagramMappingModal(msg: EnvelopeBase): void {
    const data = (msg.data ?? {}) as { modalSize?: ModalSize };

    if (SimulationRunHandler.openDiagramMappingModal) {
      SimulationRunHandler.logger.debug(
        'OPEN_DIAGRAM_MAPPING_MODAL: a diagram-mapping modal is already open; ignoring',
      );
      return;
    }

    const modal = new DiagramMappingModal(ModelManager.getClient(), {
      modalSize: data.modalSize,
      onClosed: () => {
        if (SimulationRunHandler.openDiagramMappingModal === modal) {
          SimulationRunHandler.openDiagramMappingModal = null;
        }
      },
    });
    SimulationRunHandler.openDiagramMappingModal = modal;
    modal.show();
  }

  /**
   * Handle OPEN_ADVISOR_MODAL: open the compiled Advisor consult
   * (quodsim-react ?view=advisor, AdvisorConsultModal) with the focus on its
   * URL. Unlike Studies it needs no server model id -- the consult carries the
   * document inline (relayed via STUDIO_CATALOG.document when the view
   * requests the catalog) -- so it opens instantly: no UpsertModel. The token
   * relay still runs (REQUEST_STUDIO_TOKEN).
   *
   * Malformed or missing fields degrade to a Model consult rather than a
   * refused open (AdvisorConsultModal applies the defaults).
   */
  private static handleOpenAdvisorModal(msg: EnvelopeBase): void {
    const data = (msg.data ?? {}) as {
      focusId?: string;
      focusType?: string;
      focusName?: string;
      mode?: string;
      modalSize?: ModalSize;
    };
    new AdvisorConsultModal(ModelManager.getClient(), {
      focusType: data.focusType,
      focusId: data.focusId,
      focusName: data.focusName,
      mode: data.mode,
      modalSize: data.modalSize,
    }).show();
  }

  /**
   * Handle RUN_SCENARIO from the Studies view: delegate to the
   * existing live run path (Studio can't serialize the live model or produce
   * the page SVG). Awaits the outcome from handleRunRequest and relays a
   * RUN_SCENARIO_RESULT back to the Studies view.
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
   * Handle LOCATE_ELEMENT from the Studies/Advisor view: select the
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
      SimulationRunHandler.logger.debug('LOCATE_ELEMENT: selected element', { elementId });
    } catch (e) {
      SimulationRunHandler.logger.error('LOCATE_ELEMENT: error selecting element', e);
    }
  }

  /**
   * Handle REQUEST_STUDIO_TOKEN: relay a FRESH Kinde access token back to the
   * 'studio-embed' channel (the compiled Studies/Advisor views).
   * getTokenForRelay refreshes via Lucid when the cached token is expiring, so
   * the view never receives a dead token (which would 401 its API calls). Routing is derived from msg.source so a single
   * handler serves the channel.
   */
  private static async handleRequestStudioToken(msg: EnvelopeBase): Promise<void> {
    const token = await AuthHandler.getTokenForRelay();
    const channel = SimulationRunHandler.getResponseChannel(msg);
    SimulationRunHandler.logger.debug('Relaying Studio token to the studio-embed view', { hasToken: !!token, channel });
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
   * back to the Studies/Advisor view (validation, and the Advisor's
   * document).
   */
  private static async handleRequestStudioCatalog(msg: EnvelopeBase): Promise<void> {
    const modelManager = ModelManager.getInstance();
    const modelDefinition = await modelManager.getModelDefinition();
    if (!modelDefinition) {
      SimulationRunHandler.logger.error('REQUEST_STUDIO_CATALOG: no model definition available');
      return;
    }
    const serializedModel = modelDefinitionToCleanDocument(modelDefinition);
    // `modelDefinition.model.id`/`.finishDateTime` (the Lucid page/document
    // id, and the host-projection-only finish-date convenience) have no
    // clean-wire equivalent (wire-cleanup Phase B2 Task 9 — dropped from
    // `ISerializedModel` entirely, per the engine schema), so both are read
    // off the live domain `Model` instance instead of the serialized result.
    // Fix round (review F4): `finishDateTime` was dropped from the relay
    // entirely, so every calendar-mode embed open hit a hard
    // `missing_finish_datetime` validation blocker on the Studio side.
    //
    // Fix round 2 (review R1, CRITICAL): `Model.finishDateTime` is typed
    // `Date | null`, but in the Lucid host it is actually whatever
    // StorageAdapter's `JSON.parse` produced — an ISO STRING, never coerced
    // to a real `Date` anywhere in `ModelLucid.createSimObject` (the
    // monorepo documents this exact host-date hazard at
    // `modelFields.ts`'s "DATES:" comment — flat hosts hold ISO strings,
    // not `Date` instances, until something explicitly coerces). Calling
    // `.toISOString()` unconditionally threw for every real calendar-mode
    // model, killing the ENTIRE catalog send — the opposite of what F4 was
    // fixing. String/Date-tolerant coercion below handles both shapes.
    const rawFinishDateTime: unknown = modelDefinition.model.finishDateTime;
    const finishDateTime: string | null =
      typeof rawFinishDateTime === 'string'
        ? rawFinishDateTime
        : (rawFinishDateTime as Date | null)?.toISOString?.() ?? null;
    const catalog = buildRelayedCatalog(serializedModel, {
      modelId: modelDefinition.model.id,
      finishDateTime,
    });

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

}
