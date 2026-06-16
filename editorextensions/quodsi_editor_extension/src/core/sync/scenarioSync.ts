import { EditorClient, Viewport } from 'lucid-extension-sdk';
import {
  ISerializedScenario,
  resolveModelName,
  ModelSerializerFactory,
  parsePageTranslate,
  offsetSerializedModelCoordinates,
} from '@quodsi/lucid-shared';
import { LucidDataActionUtility } from '../../utils/LucidDataActionUtility';
import { ModelManager } from '../ModelManager';

/** The canonical model name to sync to the DB: the model-definition name
 *  (domain.name) run through resolveModelName (generic/empty → timestamp). */
export async function canonicalModelName(modelManager: ModelManager): Promise<string> {
  const def = await modelManager.getModelDefinition();
  return resolveModelName((def as { name?: string } | null)?.name ?? '', new Date());
}

export interface UpsertAndSyncParams {
  documentId: string;
  pageId: string;
  modelName: string;
  scenarios: ISerializedScenario[];
  /** Envelope-level "current model definition" snapshot. When defined, it is
   *  forwarded on the SyncScenarios action and lands on
   *  models.model_definition_snapshot in the backend. */
  modelDefinitionSnapshot?: unknown;
  /** The page SVG paired with modelDefinitionSnapshot (its visual twin). When
   *  defined, forwarded on SyncScenarios and lands on models.model_diagram_svg;
   *  studies read it to give their animation a background diagram. */
  modelDiagramSvg?: string;
}

export interface UpsertAndSyncResult {
  upserted: boolean;
  syncedCount: number;
  /** replaced_id -> canonical server id, for callers that persist back to shape data */
  substitutions: Map<string, string>;
  /** Server model id from UpsertModel's response (`model.id`), or null if absent. */
  serverModelId: string | null;
}

/**
 * Canonical UpsertModel -> SyncScenarios sequence against quodsi_api.
 *
 * Sequential by necessity: SyncScenarios' first action is a binding lookup
 * keyed on (platform, documentId, pageId), and that binding is created by
 * UpsertModel. Firing in parallel races -- if the sync's lookup beats
 * UpsertModel's commit, the sync 404s "Model not found" and writes nothing.
 *
 * Throws if UpsertModel fails (no binding => the sync would 404 anyway).
 * If `scenarios` is empty, SyncScenarios is skipped (nothing to push).
 * Returns server-side id substitutions; the caller applies them to storage
 * (that needs page context + ModelManager) -- this helper does not.
 */
export async function upsertModelAndSyncScenarios(
  client: EditorClient,
  params: UpsertAndSyncParams,
): Promise<UpsertAndSyncResult> {
  const upsertResult = (await LucidDataActionUtility.performDataAction(client, {
    dataConnectorName: 'quodsi_api_data_connector',
    actionName: 'UpsertModel',
    actionData: {
      documentId: params.documentId,
      pageId: params.pageId,
      modelName: params.modelName,
    },
    asynchronous: false,
  })) as { status?: number; json?: { model?: { id?: string } } };
  // Lucid's performDataAction returns { status, json } rather than throwing on
  // 4xx (see SaveAndSubmitSimulation handling). Surface a non-2xx as a throw so
  // callers' sync-failure paths (run-abort, SYNC_ALL_ERROR, panel-init log) fire.
  if (upsertResult?.status && upsertResult.status >= 400) {
    throw new Error(`UpsertModel failed (HTTP ${upsertResult.status})`);
  }

  const upsertBody = (upsertResult as { json?: { model?: { id?: string } } })?.json ?? (upsertResult as unknown as { model?: { id?: string } });
  const serverModelId = upsertBody?.model?.id ?? null;

  const substitutions = new Map<string, string>();
  // Skip SyncScenarios only when there is nothing to push: no scenarios AND no
  // envelope-level model snapshot. When a snapshot IS provided we still run
  // SyncScenarios (even with scenarios === []) so the snapshot reaches the
  // backend and lands on models.model_definition_snapshot.
  if (params.scenarios.length === 0 && params.modelDefinitionSnapshot === undefined) {
    return { upserted: true, syncedCount: 0, substitutions, serverModelId };
  }

  const result = (await LucidDataActionUtility.performDataAction(client, {
    dataConnectorName: 'quodsi_api_data_connector',
    actionName: 'SyncScenarios',
    actionData: {
      documentId: params.documentId,
      pageId: params.pageId,
      scenarios: params.scenarios,
      ...(params.modelDefinitionSnapshot !== undefined
        ? { modelDefinitionSnapshot: params.modelDefinitionSnapshot }
        : {}),
      ...(params.modelDiagramSvg !== undefined
        ? { modelDiagramSvg: params.modelDiagramSvg }
        : {}),
    },
    asynchronous: false,
  })) as { status?: number; json?: { scenarios?: Array<{ id?: string; replaced_id?: string }> } };
  if (result?.status && result.status >= 400) {
    throw new Error(`SyncScenarios failed (HTTP ${result.status})`);
  }

  const responseData = result?.json ?? (result as any);
  for (const s of responseData?.scenarios ?? []) {
    if (s?.replaced_id && s?.id && s.replaced_id !== s.id) {
      substitutions.set(s.replaced_id, s.id);
    }
  }
  return { upserted: true, syncedCount: params.scenarios.length, substitutions, serverModelId };
}

/** Serialize the live model and push it as the envelope-level model snapshot
 *  (lands on models.model_definition_snapshot in the backend). Fire-and-forget
 *  friendly — callers `void` it; it must never throw into the caller. */
export async function pushModelDefinitionSnapshot(
  client: EditorClient,
  params: { documentId: string; pageId: string; modelName: string },
): Promise<void> {
  const def = await ModelManager.getInstance().getModelDefinition();
  if (!def) return;
  const snapshot = ModelSerializerFactory.create(def).serialize(def);
  // Capture the page SVG paired with this snapshot (its visual twin) so studies
  // get a background diagram. Best-effort: a getSvg failure must not block the
  // snapshot push — we just omit the SVG (animation renders without a diagram).
  let modelDiagramSvg: string | undefined;
  try {
    const page = new Viewport(client).getCurrentPage();
    if (page) modelDiagramSvg = await page.getSvg(undefined, true);
  } catch {
    modelDiagramSvg = undefined;
  }
  // Align the snapshot to the SVG's coordinate frame. getSvg() wraps the page in
  // translate(Tx Ty) to normalize negative coords into a positive viewBox, but
  // the serialized model (→ engine layout.json) uses raw coords — so without
  // this shift the background SVG and the animated entities are offset by (Tx,Ty)
  // in the viewer. Mirrors the single-scenario run path (simulationHandler). A
  // {0,0} translate is a no-op. The shift is uniform, so the simulation is
  // unchanged; only the layout coordinates move to share the SVG's frame.
  if (modelDiagramSvg) {
    const t = parsePageTranslate(modelDiagramSvg);
    offsetSerializedModelCoordinates(snapshot, t.x, t.y);
  }
  await upsertModelAndSyncScenarios(client, {
    ...params, scenarios: [], modelDefinitionSnapshot: snapshot, modelDiagramSvg,
  });
}

/**
 * UpsertModel, then SyncScenarios ONLY IF the DB currently has no scenarios
 * for this model (seed a fresh model's baseline). If the DB already has
 * scenarios, SKIP the push — the DB is authoritative (embed/DB-authoritative
 * mode), so a replace-all would soft-delete embed-created scenarios. Same
 * return shape as upsertModelAndSyncScenarios so call sites are interchangeable.
 */
export async function upsertModelAndSeedScenariosIfEmpty(
  client: EditorClient,
  params: UpsertAndSyncParams,
): Promise<UpsertAndSyncResult> {
  const upsertResult = (await LucidDataActionUtility.performDataAction(client, {
    dataConnectorName: 'quodsi_api_data_connector',
    actionName: 'UpsertModel',
    actionData: {
      documentId: params.documentId,
      pageId: params.pageId,
      modelName: params.modelName,
    },
    asynchronous: false,
  })) as { status?: number; json?: { model?: { id?: string } } };
  if (upsertResult?.status && upsertResult.status >= 400) {
    throw new Error(`UpsertModel failed (HTTP ${upsertResult.status})`);
  }
  const upsertBody = (upsertResult as { json?: { model?: { id?: string } } })?.json ?? (upsertResult as unknown as { model?: { id?: string } });
  const serverModelId = upsertBody?.model?.id ?? null;

  const substitutions = new Map<string, string>();

  const listResult = (await LucidDataActionUtility.performDataAction(client, {
    dataConnectorName: 'quodsi_api_data_connector',
    actionName: 'ListScenarios',
    actionData: { documentId: params.documentId, pageId: params.pageId },
    asynchronous: false,
  })) as { status?: number; json?: { scenarios?: unknown[] } };
  // Fail safe: if the read failed/uncertain, do NOT push (never risk a clobber).
  if (listResult?.status && listResult.status >= 400) {
    return { upserted: true, syncedCount: 0, substitutions, serverModelId };
  }
  const existing = ((listResult as { json?: { scenarios?: unknown[] } })?.json ?? (listResult as unknown as { scenarios?: unknown[] }))?.scenarios ?? [];
  if (existing.length > 0 || params.scenarios.length === 0) {
    return { upserted: true, syncedCount: 0, substitutions, serverModelId };
  }

  const syncResult = (await LucidDataActionUtility.performDataAction(client, {
    dataConnectorName: 'quodsi_api_data_connector',
    actionName: 'SyncScenarios',
    actionData: {
      documentId: params.documentId,
      pageId: params.pageId,
      scenarios: params.scenarios,
    },
    asynchronous: false,
  })) as { status?: number; json?: { scenarios?: Array<{ id?: string; replaced_id?: string }> } };
  if (syncResult?.status && syncResult.status >= 400) {
    throw new Error(`SyncScenarios (seed) failed (HTTP ${syncResult.status})`);
  }
  const responseData = syncResult?.json ?? (syncResult as any);
  for (const s of responseData?.scenarios ?? []) {
    if (s?.replaced_id && s?.id && s.replaced_id !== s.id) {
      substitutions.set(s.replaced_id, s.id);
    }
  }
  return { upserted: true, syncedCount: params.scenarios.length, substitutions, serverModelId };
}
