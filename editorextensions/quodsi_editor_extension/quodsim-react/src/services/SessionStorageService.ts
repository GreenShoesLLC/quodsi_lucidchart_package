/**
 * SessionStorageService
 * 
 * Manages authentication session storage with proper error handling
 * and timeout detection.
 */

import { SESSION_STORAGE_KEYS, SESSION_TIMEOUT_MS } from '../auth/config';
import { ComponentLogger } from '@quodsi/shared';

// Define a constant for the logger prefix
const LOG_PREFIX = '[SessionStorageService]';

/**
 * Interface for stored user information
 */
export interface StoredUserInfo {
  name: string;
  email: string;
}

/**
 * Interface for session state
 */
export interface SessionState {
  isAuthenticated: boolean;
  userInfo: StoredUserInfo | null;
  accessToken: string | null;
  tokenExpiration: Date | null;
  lastActive: number;
}

/**
 * SessionStorageService manages authentication session persistence
 */
export class SessionStorageService {
  private static instance: SessionStorageService;

  /**
   * Get singleton instance
   */
  public static getInstance(): SessionStorageService {
    if (!SessionStorageService.instance) {
      SessionStorageService.instance = new SessionStorageService();
      SessionStorageService.instance.setLogging(true);
    }
    return SessionStorageService.instance;
  }

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Set logging to disabled by default
    this.setLogging(false);
  }

  /**
   * Enable or disable logging for this service
   */
  public setLogging(enabled: boolean): void {
    ComponentLogger.setEnabled(LOG_PREFIX, enabled);
  }

  /**
   * Load authentication state from session storage
   */
  public loadSessionState(): SessionState | null {
    try {
      // Check if we have auth state in session storage
      const authState = sessionStorage.getItem(SESSION_STORAGE_KEYS.AUTH_STATE);
      const userInfoStr = sessionStorage.getItem(SESSION_STORAGE_KEYS.USER_INFO);
      const accessToken = sessionStorage.getItem(SESSION_STORAGE_KEYS.ACCESS_TOKEN);
      const tokenExpirationStr = sessionStorage.getItem(SESSION_STORAGE_KEYS.TOKEN_EXPIRATION);
      const lastActiveStr = sessionStorage.getItem(SESSION_STORAGE_KEYS.LAST_ACTIVE);
      
      if (!authState || !userInfoStr || !accessToken || !tokenExpirationStr || !lastActiveStr) {
        ComponentLogger.log(LOG_PREFIX, 'No complete session state found in storage');
        return null;
      }
      
      const isAuthenticated = authState === 'true';
      const userInfo = JSON.parse(userInfoStr) as StoredUserInfo;
      const tokenExpiration = new Date(tokenExpirationStr);
      const lastActive = parseInt(lastActiveStr, 10);
      
      // Check if the session is still valid (not timed out)
      if (this.isSessionTimedOut(lastActive)) {
        ComponentLogger.log(LOG_PREFIX, 'Session has timed out, returning null');
        return null;
      }
      
      ComponentLogger.log(LOG_PREFIX, 'Loaded valid session state');
      
      return {
        isAuthenticated,
        userInfo,
        accessToken,
        tokenExpiration,
        lastActive
      };
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error loading session state:', error);
      return null;
    }
  }

  /**
   * Save authentication state to session storage
   */
  public saveSessionState(state: SessionState): void {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.AUTH_STATE, state.isAuthenticated.toString());
      
      if (state.userInfo) {
        sessionStorage.setItem(SESSION_STORAGE_KEYS.USER_INFO, JSON.stringify(state.userInfo));
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.USER_INFO);
      }
      
      if (state.accessToken) {
        sessionStorage.setItem(SESSION_STORAGE_KEYS.ACCESS_TOKEN, state.accessToken);
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACCESS_TOKEN);
      }
      
      if (state.tokenExpiration) {
        sessionStorage.setItem(
          SESSION_STORAGE_KEYS.TOKEN_EXPIRATION, 
          state.tokenExpiration.toISOString()
        );
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.TOKEN_EXPIRATION);
      }
      
      this.updateLastActive();
      ComponentLogger.log(LOG_PREFIX, 'Saved session state to storage');
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error saving session state:', error);
    }
  }

  /**
   * Update last active timestamp
   */
  public updateLastActive(): void {
    try {
      const now = Date.now();
      sessionStorage.setItem(SESSION_STORAGE_KEYS.LAST_ACTIVE, now.toString());
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error updating last active timestamp:', error);
    }
  }

  /**
   * Clear all session state
   */
  public clearSessionState(): void {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.AUTH_STATE);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.USER_INFO);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACCESS_TOKEN);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.TOKEN_EXPIRATION);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.LAST_ACTIVE);
      ComponentLogger.log(LOG_PREFIX, 'Cleared session state');
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error clearing session state:', error);
    }
  }

  /**
   * Check if session is timed out
   * @param lastActive Timestamp of last activity (if not provided, reads from storage)
   * @param timeoutMs Timeout duration in milliseconds (defaults to SESSION_TIMEOUT_MS)
   */
  public isSessionTimedOut(
    lastActive?: number, 
    timeoutMs: number = SESSION_TIMEOUT_MS
  ): boolean {
    try {
      // If lastActive is not provided, try to get it from storage
      if (lastActive === undefined) {
        const lastActiveStr = sessionStorage.getItem(SESSION_STORAGE_KEYS.LAST_ACTIVE);
        if (!lastActiveStr) {
          return true; // No activity timestamp found, consider timed out
        }
        lastActive = parseInt(lastActiveStr, 10);
      }
      
      const now = Date.now();
      const timeSinceLastActive = now - lastActive;
      
      return timeSinceLastActive > timeoutMs;
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error checking session timeout:', error);
      return true; // On error, consider timed out for safety
    }
  }
  
  /**
   * Clear all MSAL-related data in storage
   */
  public clearMsalCache(): void {
    try {
      // Try to clear MSAL-related data in sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('msal.')) {
          sessionStorage.removeItem(key);
        }
      }
      
      // Try to clear MSAL-related data in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('msal.')) {
          localStorage.removeItem(key);
        }
      }
      
      // Try to clear MSAL-related cookies
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name && name.includes('msal')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      
      ComponentLogger.log(LOG_PREFIX, 'Cleared MSAL cache');
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error clearing MSAL cache:', error);
    }
  }
}

// Export singleton instance
export const sessionStorageService = SessionStorageService.getInstance();
