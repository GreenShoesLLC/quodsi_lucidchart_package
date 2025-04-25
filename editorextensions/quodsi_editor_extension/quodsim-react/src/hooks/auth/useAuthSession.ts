/**
 * useAuthSession Hook
 * 
 * Manages session state, timeout detection, and activity tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from './useAuthState';
import { useTokenManager } from './useTokenManager';
import { userSyncService } from '../../services/UserSyncService';
import { sessionStorageService } from '../../services/SessionStorageService';
import { SESSION_CHECK_INTERVAL_MS } from '../../auth/config/sessionConfig';
import { ComponentLogger } from '@quodsi/shared';

// Define a constant for the logger prefix
const LOG_PREFIX = '[useAuthSession]';

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, false);

/**
 * Helper function to enable/disable logging for this hook
 */
export const setAuthSessionLogging = (enabled: boolean): void => {
  ComponentLogger.setEnabled(LOG_PREFIX, enabled);
};

// Define the AuthSession interface
export interface AuthSession {
  sessionId: string | null;
  initializeSession: () => Promise<string | null>;
  updateSessionActivity: () => Promise<boolean>;
  endCurrentSession: () => Promise<boolean>;
  isSessionActive: boolean;
  checkSessionTimeout: () => boolean;
}

/**
 * useAuthSession hook for managing authentication sessions
 */
export function useAuthSession(): AuthSession {
  const { isAuthenticated, setIsAuthenticated, setUserInfo } = useAuthState();
  const { accessToken, getAccessToken } = useTokenManager();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);

  // Initialize the session with the backend
  const initializeSession = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated) {
      ComponentLogger.log(LOG_PREFIX, 'Cannot initialize session: Not authenticated');
      return null;
    }

    // Get a fresh token
    const token = await getAccessToken();
    if (!token) {
      ComponentLogger.log(LOG_PREFIX, 'Cannot initialize session: No token available');
      return null;
    }

    try {
      ComponentLogger.log(LOG_PREFIX, 'Creating session with backend');
      const sessionResponse = await userSyncService.createSession(token);
      
      if (sessionResponse) {
        const newSessionId = sessionResponse.session_id;
        setSessionId(newSessionId);
        setIsSessionActive(true);
        ComponentLogger.log(LOG_PREFIX, 'Session created:', newSessionId);
        return newSessionId;
      } else {
        ComponentLogger.error(LOG_PREFIX, 'Failed to create session: Empty response');
        return null;
      }
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error initializing session:', error);
      return null;
    }
  }, [isAuthenticated, getAccessToken]);

  // Update session activity on the backend
  const updateSessionActivity = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !sessionId) {
      return false;
    }

    // Get fresh token
    const token = await getAccessToken();
    if (!token) {
      return false;
    }

    try {
      // Update session activity on backend
      const success = await userSyncService.updateSession(token, sessionId);
      
      // Update local timestamp regardless of backend success
      sessionStorageService.updateLastActive();
      
      return success;
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error updating session activity:', error);
      return false;
    }
  }, [isAuthenticated, sessionId, getAccessToken]);

  // End the current session
  const endCurrentSession = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !sessionId) {
      ComponentLogger.log(LOG_PREFIX, 'No active session to end');
      return false;
    }

    // Get fresh token
    const token = await getAccessToken();
    if (!token) {
      ComponentLogger.log(LOG_PREFIX, 'Cannot end session: No token available');
      return false;
    }

    try {
      ComponentLogger.log(LOG_PREFIX, 'Ending session:', sessionId);
      const success = await userSyncService.endSession(token, sessionId);
      
      if (success) {
        setSessionId(null);
        setIsSessionActive(false);
      }
      
      return success;
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error ending session:', error);
      return false;
    }
  }, [isAuthenticated, sessionId, getAccessToken]);

  // Check for session timeout
  const checkSessionTimeout = useCallback((): boolean => {
    if (!isAuthenticated) {
      return false;
    }
    
    const isTimedOut = sessionStorageService.isSessionTimedOut();
    
    if (isTimedOut) {
      ComponentLogger.log(LOG_PREFIX, 'Session has timed out');
      
      // Clear authentication state
      setIsAuthenticated(false);
      setUserInfo(null);
      setSessionId(null);
      setIsSessionActive(false);
      
      // Clear session storage
      sessionStorageService.clearSessionState();
    }
    
    return isTimedOut;
  }, [isAuthenticated, setIsAuthenticated, setUserInfo]);

  // Set up a periodic check for session timeout
  useEffect(() => {
    if (isAuthenticated) {
      // Check for session timeout periodically
      const checkIntervalId = setInterval(() => {
        checkSessionTimeout();
      }, SESSION_CHECK_INTERVAL_MS);
      
      // Clean up interval on unmount
      return () => clearInterval(checkIntervalId);
    }
  }, [isAuthenticated, checkSessionTimeout]);

  // Initialize session when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && !sessionId && accessToken) {
      initializeSession();
    } else if (!isAuthenticated && sessionId) {
      // Reset session ID when not authenticated
      setSessionId(null);
      setIsSessionActive(false);
    }
  }, [isAuthenticated, sessionId, accessToken, initializeSession]);

  // Set up session activity tracking
  useEffect(() => {
    // If we have an active session, update activity periodically
    if (isAuthenticated && sessionId) {
      // Update activity every 5 minutes
      const activityInterval = setInterval(() => {
        ComponentLogger.log(LOG_PREFIX, 'Updating session activity');
        updateSessionActivity();
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => clearInterval(activityInterval);
    }
  }, [isAuthenticated, sessionId, updateSessionActivity]);

  return {
    sessionId,
    initializeSession,
    updateSessionActivity,
    endCurrentSession,
    isSessionActive,
    checkSessionTimeout
  };
}
