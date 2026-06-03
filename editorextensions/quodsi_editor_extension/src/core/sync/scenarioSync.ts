import { EditorClient } from 'lucid-extension-sdk';
import { ISerializedScenario } from '@quodsi/shared';
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
  })) as { status?: number };
  // Lucid's performDataAction returns { status, json } rather than throwing on
  // 4xx (see SaveAndSubmitSimulation handling). Surface a non-2xx as a throw so
  // callers' sync-failure paths (run-abort, SYNC_ALL_ERROR, panel-init log) fire.
  if (upsertResult?.status && upsertResult.status >= 400) {
    throw new Error(`UpsertModel failed (HTTP ${upsertResult.status})`);
  }

  const substitutions = new Map<string, string>();
  if (params.scenarios.length === 0) {
    return { upserted: true, syncedCount: 0, substitutions };
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
  return { upserted: true, syncedCount: params.scenarios.length, substitutions };
}
