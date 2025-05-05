import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { MessagingAction } from '../reducer';
import { debugService } from '../utils/debugService';

/**
 * Maps authentication-related messages to reducer actions
 * 
 * @param msg The envelope message to map
 * @returns A reducer action or null if not handled
 */
export function mapAuth(msg: EnvelopeBase): MessagingAction | null {
  // Skip messages that aren't auth-related
  if (
    msg.type !== EnvelopeMessageType.AUTH_STATUS &&
    msg.type !== EnvelopeMessageType.AUTH_LOGIN_SUCCESS &&
    msg.type !== EnvelopeMessageType.AUTH_LOGOUT &&
    msg.type !== EnvelopeMessageType.AUTH_PASSWORD_RESET &&
    msg.type !== EnvelopeMessageType.AUTH_REQUIRED &&
    msg.type !== EnvelopeMessageType.AUTH_ERROR
  ) {
    return null;
  }

  debugService.debug(`Auth mapper processing: ${msg.type}`);

  switch (msg.type) {
    case EnvelopeMessageType.AUTH_STATUS:
      // Extract auth status data
      const statusData = msg.data as {
        isAuthenticated: boolean;
        user?: any;
      };

      // Map to auth status update action
      console.log('Received AUTH_STATUS message:', statusData);
      return {
        type: 'AUTH_STATUS_UPDATE',
        isAuthenticated: statusData.isAuthenticated,
        userInfo: statusData.user
      };

    case EnvelopeMessageType.AUTH_LOGIN_SUCCESS:
      // Extract login success data
      const loginData = msg.data as {
        idToken: string;
        user: any;
        newUser: boolean;
      };

      // Map to auth status update action
      console.log('Received AUTH_LOGIN_SUCCESS message:', loginData);
      return {
        type: 'AUTH_STATUS_UPDATE',
        isAuthenticated: true,
        userInfo: loginData.user
      };

    case EnvelopeMessageType.AUTH_LOGOUT:
      // Map to auth status update action for logout
      return {
        type: 'AUTH_STATUS_UPDATE',
        isAuthenticated: false,
        userInfo: undefined
      };

    case EnvelopeMessageType.AUTH_REQUIRED:
      // Extract required data
      const requiredData = msg.data as {
        reason: 'not_authenticated' | 'session_expired';
      };

      // Map to auth error action
      return {
        type: 'AUTH_ERROR',
        error: requiredData.reason === 'session_expired' 
          ? 'Your session has expired. Please sign in again.'
          : 'Authentication required to perform this action.'
      };

    case EnvelopeMessageType.AUTH_ERROR:
      // Extract error data
      const errorData = msg.data as {
        code: string;
        message: string;
      };

      // Map to auth error action
      return {
        type: 'AUTH_ERROR',
        error: `${errorData.code}: ${errorData.message}`
      };

    case EnvelopeMessageType.AUTH_PASSWORD_RESET:
      // Password reset doesn't require state changes
      // Just log it for debugging
      debugService.log('Password reset was successful');
      return null;

    default:
      return null;
  }
}
