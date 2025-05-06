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
      ComponentLogger.log(LOG_PREFIX, 'Clearing MSAL cache - starting');
      
      // We need to check all possible MSAL-related keys
      const msalPrefixes = ['msal.', 'login.', 'idtoken', 'accessToken', 'refreshToken', 'authority'];
      const storages = [sessionStorage, localStorage];
      
      // Function to safely remove items from storage
      const safeRemoveItems = (storage: Storage, keysToRemove: string[]) => {
        keysToRemove.forEach(key => {
          try {
            storage.removeItem(key);
          } catch (e) {
            ComponentLogger.error(LOG_PREFIX, `Error removing item ${key}:`, e);
          }
        });
      };
      
      // Clear items from both session and local storage
      storages.forEach(storage => {
        // We need to collect keys first since removing items changes the length
        const keysToRemove: string[] = [];
        
        // Get all keys that match our MSAL prefixes
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && msalPrefixes.some(prefix => key.toLowerCase().includes(prefix.toLowerCase()))) {
            keysToRemove.push(key);
          }
        }
        
        // Log what we're removing
        if (keysToRemove.length > 0) {
          ComponentLogger.log(LOG_PREFIX, `Removing ${keysToRemove.length} MSAL-related items from ${storage === sessionStorage ? 'sessionStorage' : 'localStorage'}`);
        }
        
        // Remove the collected keys
        safeRemoveItems(storage, keysToRemove);
      });
      
      // Try to clear MSAL-related cookies
      const cookiesToRemove: string[] = [];
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name && msalPrefixes.some(prefix => name.toLowerCase().includes(prefix.toLowerCase()))) {
          cookiesToRemove.push(name);
        }
      });
      
      // Log what we're removing
      if (cookiesToRemove.length > 0) {
        ComponentLogger.log(LOG_PREFIX, `Removing ${cookiesToRemove.length} MSAL-related cookies`);
      }
      
      // Remove the cookies
      cookiesToRemove.forEach(name => {
        try {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=none`;
          // Also try with different paths in case the cookie was set differently
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}; secure; samesite=none`;
        } catch (e) {
          ComponentLogger.error(LOG_PREFIX, `Error clearing cookie ${name}:`, e);
        }
      });
      
      ComponentLogger.log(LOG_PREFIX, 'MSAL cache clearing completed');
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error clearing MSAL cache:', error);
    }
  }
}

// Export singleton instance
export const sessionStorageService = SessionStorageService.getInstance();
