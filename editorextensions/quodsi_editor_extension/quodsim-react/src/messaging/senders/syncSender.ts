import { useCallback } from 'react';
import { EnvelopeMessageType, ISerializedScenario } from '@quodsi/lucid-shared';
import { useSender } from './useSender';

/**
 * Custom hook that provides the Sync sender. Triggers SYNC_ALL_REQUEST which the
 * extension orchestrates server-side into UpsertModel + SyncScenarios +
 * ListScenarios + ListSimulationRuns.
 *
 * @returns Object containing sync operation message sender functions
 */
export function useSyncSender() {
  const send = useSender();

  /**
   * Send a SYNC_ALL_REQUEST message to sync the model and scenarios with the server
   *
   * @param documentId Document ID to sync
   * @param pageId Page ID containing the model
   * @param modelName Name of the model being synced
   * @param scenarios Array of scenarios to sync
   */
  const syncAll = useCallback(
    (documentId: string, pageId: string, modelName: string, scenarios: ISerializedScenario[]) => {
      send(EnvelopeMessageType.SYNC_ALL_REQUEST, {
        documentId,
        pageId,
        modelName,
        scenarios,
      });
    },
    [send],
  );

  return { syncAll };
}
