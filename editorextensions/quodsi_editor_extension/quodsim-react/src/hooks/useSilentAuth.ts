import { useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMessagingDispatch } from '../messaging/MessageProvider';
import { debugService } from '../messaging/utils/debugService';
import { AuthStorageService } from '../services/AuthStorageService';

/**
 * Hook to handle silent authentication during application initialization
 * Checks for existing accounts and attempts to restore the authentication state
 */
export function useSilentAuth(): void {
  const { instance, accounts, inProgress } = useMsal();
  const dispatch = useMessagingDispatch();
  
  useEffect(() => {
    // Start with marking auth as loading
    dispatch({
      type: 'AUTH_LOADING',
      isLoading: true
    });
    
    // Only run the full silent auth when MSAL is initialized (inProgress === 'none')
    if (inProgress === 'none') {
      const attemptSilentAuth = async () => {
        try {
          debugService.log('Checking for existing accounts for silent authentication');
          
          // Check if we have any accounts in MSAL cache
          if (accounts.length > 0) {
            // We found an account, use the first one
            const account = accounts[0];
            
            debugService.log(`Found existing account: ${account.username}, attempting silent auth`);
            
            // Log account details for debugging
            debugService.log(`Silent auth found account: ${account.username}`);
            
            // First, force set the active account
            try {
              instance.setActiveAccount(account);
              debugService.log('Set active account for silent auth');
            } catch (e) {
              debugService.error('Failed to set active account:', e);
            }
            
            // Create user info from account
            const userInfo = {
              id: account.localAccountId,
              email: account.username,
              displayName: account.name || account.username
            };
            
            // Update auth state in the messaging system
            dispatch({
              type: 'AUTH_STATUS_UPDATE',
              isAuthenticated: true,
              userInfo
            });
            
            debugService.log('Silent authentication successful');
          } else {
            // No MSAL accounts found, check localStorage as fallback
            const storedAuth = AuthStorageService.loadAuthState();
            
            if (storedAuth && storedAuth.isAuthenticated && storedAuth.userInfo) {
              debugService.log('Restoring auth state from localStorage');
              
              // Update auth state in the messaging system
              dispatch({
                type: 'AUTH_STATUS_UPDATE',
                isAuthenticated: true,
                userInfo: storedAuth.userInfo || undefined
              });
              
              debugService.log('Auth state restored from localStorage');
            } else {
              debugService.log('No existing authentication found');
              
              // Explicitly set not authenticated to ensure auth is initialized
              dispatch({
                type: 'AUTH_STATUS_UPDATE',
                isAuthenticated: false,
                userInfo: undefined
              });
            }
          }
        } catch (error) {
          debugService.error('Silent authentication failed:', error);
          
          // Ensure auth state is initialized even on error
          dispatch({
            type: 'AUTH_STATUS_UPDATE',
            isAuthenticated: false,
            userInfo: undefined
          });
        } finally {
          // Mark authentication as no longer loading
          dispatch({
            type: 'AUTH_LOADING',
            isLoading: false
          });
        }
      };
      
      // Run the silent auth check
      attemptSilentAuth();
    }
  }, [inProgress, accounts, dispatch, instance]);
}