import { useMemo, useCallback } from 'react';
import { useAuth } from '../MessageProvider';
import { useAuthSender } from '../senders/authSender';
import { useMessagingDispatch } from '../MessageProvider';

/**
 * Enhanced hook for authentication state that combines state and actions
 * 
 * @returns Auth state and auth-related actions
 */
export function useAuthState() {
  const auth = useAuth();
  const { sendLogout, sendLoginSuccess } = useAuthSender();
  const dispatch = useMessagingDispatch();
  
  // Add a direct auth sync function that bypasses normal flow
  const syncAuthStateNow = useCallback((isAuth: boolean, userInfo: any) => {
    // Update global state through dispatch
    dispatch({
      type: 'AUTH_STATUS_UPDATE',
      isAuthenticated: isAuth,
      userInfo
    });
  }, [dispatch]);
  
  // Combine state and actions into a single object
  const authState = useMemo(() => ({
    // State
    isAuthenticated: auth.isAuthenticated,
    userInfo: auth.userInfo,
    isLoading: auth.isLoading,
    error: auth.error,
    
    // Actions
    logout: () => sendLogout(),
    login: (idToken: string, user: any, isNewUser: boolean) => 
      sendLoginSuccess(idToken, user, isNewUser),
    // Add the direct sync function
    syncAuthStateNow
  }), [
    auth.isAuthenticated, 
    auth.userInfo,
    auth.isLoading,
    auth.error,
    sendLogout,
    sendLoginSuccess,
    syncAuthStateNow
  ]);
  
  return authState;
}
