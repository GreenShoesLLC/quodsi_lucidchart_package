import { EditorClient } from 'lucid-extension-sdk';
import { ISerializedScenario } from '@quodsi/lucid-shared';
import { LucidDataActionUtility } from '../../utils/LucidDataActionUtility';

export interface UpsertAndSyncParams {
  documentId: string;
  pageId: string;
  modelName: string;
  scenarios: ISerializedScenario[];
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
  if (params.scenarios.length === 0) {
    return { upserted: true, syncedCount: 0, substitutions, serverModelId };
  }

  const result = (await LucidDataActionUtility.performDataAction(client, {
    dataConnectorName: 'quodsi_api_data_connector',
    actionName: 'SyncScenarios',
    actionData: {
      documentId: params.documentId,
      pageId: params.pageId,
      scenarios: params.scenarios,
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
