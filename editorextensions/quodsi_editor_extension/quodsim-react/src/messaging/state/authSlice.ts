import { QuodsiUserInfo } from '@quodsi/shared';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('AuthSlice');

export interface AuthState {
  isAuthenticated: boolean;
  user?: QuodsiUserInfo;
}

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: undefined,
};

export type AuthAction =
  | { type: 'AUTH_STATUS_UPDATE'; isAuthenticated: boolean; user?: QuodsiUserInfo }
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
      });
      return {
        ...state,
        isAuthenticated: action.isAuthenticated,
        user: action.user,
      };
    case 'AUTH_ERROR':
      logger.debug('AUTH_ERROR:', { code: action.code, message: action.message });
      return state;
    default:
      return state;
  }
}
