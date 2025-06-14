import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { debugService } from '../utils/debugService';
import { MessagingAction } from '../state/types';

// Create a component-specific logger
const logger = debugService.forComponent('AuthMapper');

// Global debugging variable to help diagnose auth issues
// Can be accessed from the browser console
if (typeof window !== 'undefined') {
  (window as any).QUODSI_DEBUG = {
    forceAuthUpdate: (isAuthenticated: boolean = true) => {
      console.log('[REACT][AuthMapper] MANUAL: Forcing auth update:', { isAuthenticated });
      
      // Create a fake auth status action
      const action: MessagingAction = {
        type: 'AUTH_STATUS_UPDATE',
        isAuthenticated,
        userInfo: isAuthenticated ? { id: 'Debug', email: 'debug@example.com', displayName: 'Debug User' } : undefined
      };
      
      return action;
    },
    checkAuthStatus: () => {
      try {
        // Get current auth state from reducer if possible
        const state = (window as any).__QUODSI_STATE__;
        if (state && state.auth) {
          console.log('[REACT][AuthMapper] Current auth state:', state.auth);
          return state.auth;
        }
        return 'Auth state not found';
      } catch (err) {
        return 'Error checking auth state';
      }
    }
  };
  
  // Store a reference to window.__QUODSI_STATE__ for debugging
  Object.defineProperty((window as any), '__QUODSI_STATE__', {
    get: function() {
      try {
        // Try to find the state in React DevTools
        const store = (window as any).__REACT_CONTEXT_DEVTOOL_GLOBAL_HOOK__?.store;
        if (store) {
          const foundItem = Object.values(store).find((item: any) => 
            item?.state && item?.state?.auth && typeof item?.state?.auth?.isAuthenticated === 'boolean'
          ) as any;
          return foundItem && foundItem.state ? foundItem.state : undefined;
        }
      } catch (err) {}
      return undefined;
    }
  });
}

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
  logger.log(`Processing message: ${msg.type}`, msg);

  switch (msg.type) {
    case EnvelopeMessageType.AUTH_STATUS:
      // Extract auth status data
      const statusData = msg.data as {
        isAuthenticated: boolean;
        user?: any;
      };

      // Map to auth status update action
      logger.log('Processing AUTH_STATUS message:', statusData);
      console.log('[REACT][AuthMapper] Processing AUTH_STATUS with data:', {
        isAuthenticated: statusData.isAuthenticated,
        hasUser: !!statusData.user,
        panelType: window.location.search.includes('panel=auth') ? 'auth' : 'model',
        timestamp: new Date().toISOString()
      });

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
      logger.log('Processing AUTH_LOGIN_SUCCESS message:', loginData);
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
