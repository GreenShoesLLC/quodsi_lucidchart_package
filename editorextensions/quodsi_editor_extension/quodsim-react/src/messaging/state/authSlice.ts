import { ExtensionConfig, QuodsiUserInfo } from '@quodsi/shared';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('AuthSlice');

export interface AuthState {
  isAuthenticated: boolean;
  user?: QuodsiUserInfo;
  /** Environment-level config from the extension (Studio URL, etc.). Set
   *  via AUTH_STATUS broadcasts; constant per running extension. */
  config?: ExtensionConfig;
}

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: undefined,
  config: undefined,
};

export type AuthAction =
  | {
      type: 'AUTH_STATUS_UPDATE';
      isAuthenticated: boolean;
      user?: QuodsiUserInfo;
      config?: ExtensionConfig;
    }
  | { type: 'AUTH_ERROR'; code: string; message: string };

export function authReducer(
  state: AuthState = initialAuthState,
  action: AuthAction
): AuthState {
  switch (action.type) {
    case 'AUTH_STATUS_UPDATE':
      logger.debug('AUTH_STATUS_UPDATE:', {
        isAuthenticated: action.isAuthenticated,
        userId: action.user?.id,
        email: action.user?.email,
        studioBaseUrl: action.config?.studioBaseUrl,
      });
      return {
        ...state,
        isAuthenticated: action.isAuthenticated,
        user: action.user,
        // Keep existing config if a broadcast doesn't include one (defensive
        // against older extension builds that don't populate it).
        config: action.config ?? state.config,
      };
    case 'AUTH_ERROR':
      logger.debug('AUTH_ERROR:', { code: action.code, message: action.message });
      return state;
    default:
      return state;
  }
}
