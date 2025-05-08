import { useCallback } from 'react';
import { AuthStorageService } from '../../services/AuthStorageService';
import { debugService } from '../utils/debugService';
import { MessagingAction } from '../state';

const logger = debugService.forComponent('useAuthState');

/**
 * Hook for managing auth state synchronization with localStorage
 */
export function useAuthState(
  state: { auth: { isAuthenticated: boolean; userInfo?: any } },
  dispatch: React.Dispatch<any>
) {
  /**
   * Ensures the component auth state is synchronized with localStorage
   * Returns the effective auth state (from localStorage if available, or component state as fallback)
   */
  const ensureAuthState = useCallback(() => {
    try {
      const storedAuth = AuthStorageService.loadAuthState();
      if (storedAuth && storedAuth.isAuthenticated && storedAuth.userInfo) {
        logger.log('Found valid auth in localStorage');
        console.log('[REACT][useAuthState] Found valid auth in localStorage! User:', storedAuth.userInfo.email);
        
        if (!state.auth.isAuthenticated) {
          logger.log('Forcing local state authentication from localStorage');
          console.log('[REACT][useAuthState] IMPORTANT: Forcing local state authentication from localStorage');
          
          dispatch({
            type: 'AUTH_STATUS_UPDATE',
            isAuthenticated: true,
            userInfo: storedAuth.userInfo
          });
        }
        
        return { isAuthenticated: true, userInfo: storedAuth.userInfo };
      }
    } catch (e) {
      logger.error('Error checking localStorage:', e);
      console.error('[REACT][useAuthState] Error checking localStorage:', e);
    }
    
    return { 
      isAuthenticated: state.auth.isAuthenticated, 
      userInfo: state.auth.userInfo 
    };
  }, [state.auth.isAuthenticated, state.auth.userInfo, dispatch]);
  
  return { ensureAuthState };
}
