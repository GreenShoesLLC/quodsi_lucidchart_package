import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('SyncSlice');

/**
 * State tracking the user-facing Sync button.
 *
 * - `isSyncing` flips to true when the user clicks Sync (SYNC_ALL_START) and
 *   back to false when the extension reports SYNC_ALL_SUCCESS or
 *   SYNC_ALL_ERROR.
 * - `lastSyncedAt` is the epoch-ms timestamp of the most recent successful
 *   sync; null until the first success.
 * - `lastError` holds the most recent error message; cleared on each start
 *   and on each success.
 */
export interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  lastError: string | null;
}

export const initialSyncState: SyncState = {
  isSyncing: false,
  lastSyncedAt: null,
  lastError: null,
};

export type SyncAction =
  | { type: 'SYNC_ALL_START' }
  | {
      type: 'SYNC_ALL_SUCCESS_UPDATE';
      scenariosCount: number;
      runsCount: number;
      durationMs: number;
    }
  | {
      type: 'SYNC_ALL_ERROR_UPDATE';
      step: string;
      error: string;
    };

export function syncReducer(
  state: SyncState = initialSyncState,
  action: SyncAction
): SyncState {
  switch (action.type) {
    case 'SYNC_ALL_START':
      logger.debug('SYNC_ALL_START');
      return {
        ...state,
        isSyncing: true,
        lastError: null,
      };
    case 'SYNC_ALL_SUCCESS_UPDATE':
      logger.debug('SYNC_ALL_SUCCESS_UPDATE:', {
        scenariosCount: action.scenariosCount,
        runsCount: action.runsCount,
        durationMs: action.durationMs,
      });
      return {
        ...state,
        isSyncing: false,
        lastSyncedAt: Date.now(),
        lastError: null,
      };
    case 'SYNC_ALL_ERROR_UPDATE':
      logger.debug('SYNC_ALL_ERROR_UPDATE:', {
        step: action.step,
        error: action.error,
      });
      return {
        ...state,
        isSyncing: false,
        lastError: action.error || 'Unknown sync error',
      };
    default:
      return state;
  }
}
