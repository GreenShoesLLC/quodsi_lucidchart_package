import { EnvelopeBase, EnvelopeMessageType, getLogger } from '@quodsi/lucid-shared';
import { MessagingAction } from '../state/types';

const logger = getLogger('AuthMapper');

/**
 * Maps auth-related envelope messages to Redux actions
 */
export function mapAuth(msg: EnvelopeBase): MessagingAction | null {
  switch (msg.type) {
    case EnvelopeMessageType.AUTH_STATUS: {
      const data = msg.data as { isAuthenticated: boolean; user?: any; config?: any };
      logger.debug('AUTH_STATUS received:', {
        isAuthenticated: data.isAuthenticated,
        userId: data.user?.id,
        studioBaseUrl: data.config?.studioBaseUrl,
      });
      return {
        type: 'AUTH_STATUS_UPDATE',
        isAuthenticated: data.isAuthenticated,
        user: data.user,
        config: data.config,
      };
    }
    case EnvelopeMessageType.AUTH_ERROR: {
      const data = msg.data as { code: string; message: string };
      logger.debug('AUTH_ERROR received:', data);
      return {
        type: 'AUTH_ERROR',
        code: data.code,
        message: data.message,
      };
    }
    default:
      return null;
  }
}
