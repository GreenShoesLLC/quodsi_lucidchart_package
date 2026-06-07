import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/lucid-shared';
import { MessagingAction } from '../state/types';
import { debugService } from '../utils/debugService';

/**
 * Maps storage-related messages to reducer actions
 * 
 * @param msg The envelope message to map
 * @returns A reducer action or null if not handled
 */
export function mapStorage(msg: EnvelopeBase): MessagingAction | null {
  // Skip messages that aren't storage-related
  if (
    msg.type !== EnvelopeMessageType.STORAGE_CONNECT_RESULT &&
    msg.type !== EnvelopeMessageType.STORAGE_STATUS
  ) {
    return null;
  }

  debugService.debug(`Storage mapper processing: ${msg.type}`);

  switch (msg.type) {
    case EnvelopeMessageType.STORAGE_CONNECT_RESULT:
      // Extract connect result data
      const connectData = msg.data as {
        provider: 'google_drive' | 'onedrive';
        success: boolean;
        userIdentifier?: string;
        error?: string;
      };

      // If error, log it
      if (!connectData.success && connectData.error) {
        debugService.error(`Storage connection failed: ${connectData.error}`);
        return null;
      }

      // Success doesn't require state changes
      // A STORAGE_STATUS message will follow with the updated state
      return null;

    case EnvelopeMessageType.STORAGE_STATUS:
      // Extract storage status data
      const statusData = msg.data as {
        googleDrive: {
          status: 'connected' | 'disconnected' | 'connecting' | 'error';
          user?: string;
        };
        oneDrive: {
          status: 'connected' | 'disconnected' | 'connecting' | 'error';
          user?: string;
        };
      };

      // Currently, we don't have a specific state slice for storage
      // We could add one in the future, but for now we'll just log
      debugService.log('Storage status update:', statusData);
      
      // No state changes for now
      return null;

    default:
      return null;
  }
}
