import { useCallback } from 'react';
import { useMessaging, useMessagingDispatch } from '../../messaging/MessageContext';
import { EnvelopeMessageType } from '@quodsi/shared';
import { AuthStorageService } from '../../services/AuthStorageService';
import { useAuthState as useAuthStateBase } from '../../messaging/hooks';
import { useSendMessage } from '../../messaging/hooks/useSendMessage';

/**
 * A specialized hook for use in AuthPanel component
 * Adds login, logout, and other AuthPanel-specific functions on top of the base auth state
 */
export const useAuthPanelState = () => {
  const { auth } = useMessaging();
  const dispatch = useMessagingDispatch();
  // Get the auth state from useAuthState hook
  const { ensureAuthState } = useAuthStateBase({ auth }, dispatch);
  const sendMessage = useSendMessage({ app: { panelType: 'auth' } }, dispatch);
  
  // Extract auth state from the messaging context
  const { isAuthenticated, userInfo, isLoading, error } = auth;
  
  // Function to handle login
  const login = useCallback((idToken: string, user: any, isNewUser: boolean) => {
    // Save auth state to localStorage
    AuthStorageService.saveAuthState(true, user);
    
    // Update local state
    dispatch({
      type: 'AUTH_STATUS_UPDATE',
      isAuthenticated: true,
      userInfo: user
    });
    
    // Send message to host
    sendMessage(EnvelopeMessageType.AUTH_LOGIN_SUCCESS, {
      idToken,
      user,
      newUser: isNewUser
    });
  }, [dispatch, sendMessage]);
  
  // Function to handle logout
  const logout = useCallback(() => {
    // Clear auth state from localStorage
    AuthStorageService.clearAuthState();
    
    // Update local state
    dispatch({
      type: 'AUTH_STATUS_UPDATE',
      isAuthenticated: false,
      userInfo: undefined
    });
    
    // Send message to host
    sendMessage(EnvelopeMessageType.AUTH_LOGOUT);
  }, [dispatch, sendMessage]);
  
  // Function to sync auth state immediately without dispatching messages
  const syncAuthStateNow = useCallback((isAuthenticated: boolean, userInfo: any) => {
    // Save to localStorage if authenticated
    if (isAuthenticated && userInfo) {
      AuthStorageService.saveAuthState(isAuthenticated, userInfo);
    } else if (!isAuthenticated) {
      AuthStorageService.clearAuthState();
    }
    
    // Update local state
    dispatch({
      type: 'AUTH_STATUS_UPDATE',
      isAuthenticated,
      userInfo
    });
  }, [dispatch]);
  
  // Return all the auth state and functions
  return {
    isAuthenticated,
    userInfo,
    isLoading,
    error,
    login,
    logout,
    syncAuthStateNow,
    ensureAuthState
  };
};
