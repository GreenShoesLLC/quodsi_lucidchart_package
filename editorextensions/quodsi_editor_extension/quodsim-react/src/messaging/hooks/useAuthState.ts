import { useMemo } from 'react';
import { useAuth } from '../MessageProvider';
import { useAuthSender } from '../senders/authSender';

/**
 * Enhanced hook for authentication state that combines state and actions
 * 
 * @returns Auth state and auth-related actions
 */
export function useAuthState() {
  const auth = useAuth();
  const { sendLogout, sendLoginSuccess } = useAuthSender();
  
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
      sendLoginSuccess(idToken, user, isNewUser)
  }), [
    auth.isAuthenticated, 
    auth.userInfo,
    auth.isLoading,
    auth.error,
    sendLogout,
    sendLoginSuccess
  ]);
  
  return authState;
}
