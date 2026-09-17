import { EditorClient, Viewport } from 'lucid-extension-sdk';
import {
  resolveModelName,
  modelDefinitionToCleanDocument,
  evaluateValidationGate,
} from '@quodsi/lucid-shared';
import { LucidDataActionUtility } from '../../utils/LucidDataActionUtility';
import { ModelManager } from '../ModelManager';
import { alignModelToPageSvg } from './pageSvg';

/** The canonical model name to sync to the DB: the model-definition name
 *  (domain.name) run through resolveModelName (generic/empty → timestamp). */
export async function canonicalModelName(modelManager: ModelManager): Promise<string> {
  const def = await modelManager.getModelDefinition();
  return resolveModelName((def as { name?: string } | null)?.name ?? '', new Date());
}

export interface UpsertModelResult {
  /** Server model id from UpsertModel's response (`model.id`), or null if absent. */
  serverModelId: string | null;
}

/**
 * Ensures the model row exists in quodsi_api (UpsertModel only). The extension
 * is not scenario-authoritative: scenarios live in the database and are never
 * sent from here.
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

  return { serverModelId };
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
  const snapshot = modelDefinitionToCleanDocument(def);
  // The page SVG paired with this snapshot (its visual twin) so studies get a
  // background diagram, with the snapshot moved into its frame -- the same
  // step the run path takes. Best effort: without an SVG the push still goes
  // out and the animation renders without a diagram.
  let page: ReturnType<Viewport['getCurrentPage']> | undefined;
  try {
    page = new Viewport(client).getCurrentPage();
  } catch {
    page = undefined;
  }
  const modelDiagramSvg = page
    ? await alignModelToPageSvg(snapshot, page, { bestEffort: true })
    : undefined;
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
