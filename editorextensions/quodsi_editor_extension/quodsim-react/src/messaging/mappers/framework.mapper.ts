import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { MessagingAction } from '../reducer';
import { debugService } from '../utils/debugService';

/**
 * Maps framework-related messages to reducer actions
 * Handles core lifecycle messages: REACT_APP_READY, ERROR, LOG
 * 
 * @param msg The envelope message to map
 * @returns A reducer action or null if not handled
 */
export function mapFramework(msg: EnvelopeBase): MessagingAction | null {
  // Skip messages that aren't framework-related
  if (
    msg.type !== EnvelopeMessageType.ERROR &&
    msg.type !== EnvelopeMessageType.LOG
  ) {
    return null;
  }

  debugService.debug(`Framework mapper processing: ${msg.type}`);

  switch (msg.type) {
    case EnvelopeMessageType.ERROR:
      // Extract error data from message
      const errorData = msg.data as {
        code: string;
        message: string;
        id?: string;
      };

      // Log the error for debugging
      debugService.error(`Received ERROR message: [${errorData.code}] ${errorData.message}`);

      // Map to an app error action
      return {
        type: 'APP_ERROR',
        error: `${errorData.code}: ${errorData.message}`
      };

    case EnvelopeMessageType.LOG:
      // Extract log data from message
      const logData = msg.data as {
        level: 'debug' | 'info';
        text: string;
      };

      // Forward to debug service
      if (logData.level === 'debug') {
        debugService.debug(`[Host] ${logData.text}`);
      } else {
        debugService.log(`[Host] ${logData.text}`);
      }

      // No state changes for log messages
      return null;

    default:
      // We shouldn't reach here due to the initial check
      return null;
  }
}

/**
 * Creates a typed ERROR message action
 * 
 * @param code Error code
 * @param message Human-readable error message
 * @param id Optional correlation ID
 * @returns Messaging action
 */
export function createErrorAction(
  code: string,
  message: string,
  id?: string
): MessagingAction {
  return {
    type: 'APP_ERROR',
    error: `${code}: ${message}`
  };
}
