import { QuodsiUserInfo } from '@quodsi/shared';
import { debugService } from '../messaging/utils/debugService';

// Create a dedicated logger for AuthStorageService
const logger = debugService.forComponent('AuthStorageService');

// Keys for local storage
const STORAGE_KEYS = {
  AUTH_STATE: 'quodsi_auth_state',
  USER_INFO: 'quodsi_user_info',
  LAST_ACTIVE: 'quodsi_last_active'
};

// Expiration time (30 days in milliseconds)
const AUTH_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

// Interface for stored auth state
export interface StoredAuthState {
  isAuthenticated: boolean;
  userInfo: QuodsiUserInfo | null | undefined;
  lastUpdated: number;
}

/**
 * Service for managing persistent authentication state
 */
export class AuthStorageService {
  /**
  * Store authentication state in localStorage
  */
static saveAuthState(isAuthenticated: boolean, userInfo: QuodsiUserInfo | null | undefined): void {
    try {
      const authState: StoredAuthState = {
        isAuthenticated,
        userInfo,
        lastUpdated: Date.now()
      };
      
      localStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(authState));
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, Date.now().toString());
      
      logger.log('Saved auth state to localStorage', { 
        isAuthenticated, 
        hasUserInfo: !!userInfo 
      });
    } catch (error) {
      logger.error('Error saving auth state to localStorage:', error);
    }
  }
  
  /**
   * Load authentication state from localStorage
   */
  static loadAuthState(): StoredAuthState | null {
    try {
      const authStateJson = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
      if (!authStateJson) {
        logger.log('No auth state found in localStorage');
        return null;
      }
      
      const authState = JSON.parse(authStateJson) as StoredAuthState;
      
      // Check if the stored state has expired
      const now = Date.now();
      if (now - authState.lastUpdated > AUTH_EXPIRATION_MS) {
        logger.log('Stored auth state has expired');
        this.clearAuthState();
        return null;
      }
      
      // Update last active timestamp
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, now.toString());
      
      logger.log('Loaded auth state from localStorage', {
        isAuthenticated: authState.isAuthenticated,
        hasUserInfo: !!authState.userInfo,
        age: Math.round((now - authState.lastUpdated) / 1000 / 60) + ' minutes'
      });
      
      return authState;
    } catch (error) {
      logger.error('Error loading auth state from localStorage:', error);
      return null;
    }
  }
  
  /**
   * Clear authentication state from localStorage
   */
  static clearAuthState(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
      localStorage.removeItem(STORAGE_KEYS.USER_INFO);
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVE);
      
      logger.log('Cleared auth state from localStorage');
    } catch (error) {
      logger.error('Error clearing auth state from localStorage:', error);
    }
  }
  
  /**
   * Check if the stored auth state should be considered valid
   */
  static isAuthStateValid(): boolean {
    try {
      const authStateJson = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
      if (!authStateJson) return false;
      
      const authState = JSON.parse(authStateJson) as StoredAuthState;
      
      // Check authentication and expiration
      const now = Date.now();
      const isValid = (
        authState.isAuthenticated &&
        authState.userInfo !== null &&
        now - authState.lastUpdated <= AUTH_EXPIRATION_MS
      );
      
      logger.log(`Auth state validity check: ${isValid}`);
      return isValid;
    } catch (error) {
      logger.error('Error checking auth state validity:', error);
      return false;
    }
  }
  
  /**
   * Update the "last active" timestamp to prevent expiration
   */
  static updateLastActive(): void {
    try {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, now.toString());
      
      // Also update the lastUpdated field in the auth state
      const authStateJson = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
      if (authStateJson) {
        const authState = JSON.parse(authStateJson) as StoredAuthState;
        authState.lastUpdated = now;
        localStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(authState));
      }
      
      logger.log('Updated last active timestamp');
    } catch (error) {
      logger.error('Error updating last active timestamp:', error);
    }
  }
}