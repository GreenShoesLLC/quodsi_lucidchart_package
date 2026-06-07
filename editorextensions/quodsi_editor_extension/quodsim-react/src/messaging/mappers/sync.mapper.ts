import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/lucid-shared';
import { MessagingAction } from '../state/types';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('SyncMapper');

/**
 * Maps SYNC_ALL_SUCCESS and SYNC_ALL_ERROR envelope messages into Redux
 * actions for the sync slice. SYNC_ALL_REQUEST flows extension-bound and is
 * not mapped; SYNC_ALL_START is dispatched directly by the React side when
 * the user clicks the Sync button.
 */
export function mapSync(msg: EnvelopeBase): MessagingAction | null {
  switch (msg.type) {
    case EnvelopeMessageType.SYNC_ALL_SUCCESS: {
      const data = msg.data as {
        scenariosCount: number;
        runsCount: number;
        durationMs: number;
      };
      logger.log('SYNC_ALL_SUCCESS received:', data);
      return {
        type: 'SYNC_ALL_SUCCESS_UPDATE',
        scenariosCount: data.scenariosCount,
        runsCount: data.runsCount,
        durationMs: data.durationMs,
      };
    }
    case EnvelopeMessageType.SYNC_ALL_ERROR: {
      const data = msg.data as { step: string; error: string };
      logger.log('SYNC_ALL_ERROR received:', data);
      return {
        type: 'SYNC_ALL_ERROR_UPDATE',
        step: data.step,
        error: data.error,
      };
    }
    default:
      return null;
  }
}
