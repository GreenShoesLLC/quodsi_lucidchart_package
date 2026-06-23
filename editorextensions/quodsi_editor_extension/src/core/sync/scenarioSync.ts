import { EditorClient, Viewport } from 'lucid-extension-sdk';
import {
  resolveModelName,
  ModelSerializerFactory,
  parsePageTranslate,
  offsetSerializedModelCoordinates,
  evaluateValidationGate,
} from '@quodsi/lucid-shared';
import { LucidDataActionUtility } from '../../utils/LucidDataActionUtility';
import { ModelManager } from '../ModelManager';

/** The canonical model name to sync to the DB: the model-definition name
 *  (domain.name) run through resolveModelName (generic/empty → timestamp). */
export async function canonicalModelName(modelManager: ModelManager): Promise<string> {
  const def = await modelManager.getModelDefinition();
  return resolveModelName((def as { name?: string } | null)?.name ?? '', new Date());
}

export interface UpsertModelResult {
  /** Server model id from UpsertModel's response (`model.id`), or null if absent. */
  serverModelId: string | null;
  /** Always empty — UpsertModel does not rewrite scenario ids.
   *  Kept so call sites can share the same guard (`if (substitutions.size > 0)`). */
  substitutions: Map<string, string>;
}

/**
 * Ensures the model row exists in quodsi_api (UpsertModel only).
 * The extension is not scenario-authoritative — SyncScenarios has been removed
 * from this path. Callers that previously guarded on substitutions.size > 0
 * are safe: the map is always empty.
 */
export async function upsertModel(
  client: EditorClient,
  params: { documentId: string; pageId: string; modelName: string },
): Promise<UpsertModelResult> {
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
  // 4xx. Surface a non-2xx as a throw so callers' failure paths fire correctly.
  if (upsertResult?.status && upsertResult.status >= 400) {
    throw new Error(`UpsertModel failed (HTTP ${upsertResult.status})`);
  }

  const upsertBody = (upsertResult as { json?: { model?: { id?: string } } })?.json ?? (upsertResult as unknown as { model?: { id?: string } });
  const serverModelId = upsertBody?.model?.id ?? null;

  return { serverModelId, substitutions: new Map() };
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
  // the serialized model (-> engine layout.json) uses raw coords -- so without
  // this shift the background SVG and the animated entities are offset by (Tx,Ty)
  // in the viewer. Mirrors the single-scenario run path (simulationHandler). A
  // {0,0} translate is a no-op. The shift is uniform, so the simulation is
  // unchanged; only the layout coordinates move to share the SVG's frame.
  if (modelDiagramSvg) {
    const t = parsePageTranslate(modelDiagramSvg);
    offsetSerializedModelCoordinates(snapshot, t.x, t.y);
  }
  // Push the snapshot + SVG via UpsertModel ONLY -- never SyncScenarios. The
  // extension is not scenario-authoritative (scenarios live in the DB / embed),
  // so it must not send a scenario list: a replace-all with an empty list would
  // soft-delete + purge the embed's study-less scenarios (data loss).
  await LucidDataActionUtility.performDataAction(client, {
    dataConnectorName: 'quodsi_api_data_connector',
    actionName: 'UpsertModel',
    actionData: {
      documentId: params.documentId,
      pageId: params.pageId,
      modelName: params.modelName,
      modelDefinitionSnapshot: snapshot,
      modelIsValid: evaluateValidationGate(def).canSimulate,
      ...(modelDiagramSvg !== undefined ? { modelDiagramSvg } : {}),
    },
    asynchronous: false,
  });
}
