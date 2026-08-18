import { EnvelopeBase, EnvelopeMessageType, getLogger } from '@quodsi/lucid-shared';
import { MessagingAction } from '../state/types';

const logger = getLogger('FrameworkMapper');

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

  logger.debug(`Framework mapper processing: ${msg.type}`);

  switch (msg.type) {
    case EnvelopeMessageType.ERROR:
      // Extract error data from message
      const errorData = msg.data as {
        code: string;
        message: string;
        id?: string;
      };

      // Log the error for debugging
      logger.error(`Received ERROR message: [${errorData.code}] ${errorData.message}`);

      // No state changes for error messages - just log them
      return null;

    case EnvelopeMessageType.LOG:
      // Extract log data from message
      const logData = msg.data as {
        level: 'debug' | 'info';
        text: string;
      };

      // Forward to debug service
      if (logData.level === 'debug') {
        logger.debug(`[Host] ${logData.text}`);
      } else {
        logger.debug(`[Host] ${logData.text}`);
      }

      // No state changes for log messages
      return null;

    default:
      // We shouldn't reach here due to the initial check
      return null;
  }
}

