/**
 * UserSyncService
 * 
 * Handles synchronization of user information with the quodsi-fastapi backend.
 */

import { authApiConfig } from '../auth/config';
import { authErrorHandler } from '../_deprecated/AuthErrorHandler';
import { ComponentLogger } from '@quodsi/shared';

// Define a constant for the logger prefix
const LOG_PREFIX = '[UserSyncService]';

/**
 * Interface for user sync response from API
 */
export interface UserSyncResponse {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  sync_source: string;
  last_synced_at: string;
}

/**
 * Interface for user profile response from API
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  last_login: string;
  usage_stats?: {
    total_sessions: number;
    total_duration_seconds: number;
    last_active: string;
  };
}

/**
 * UserSyncService for managing user synchronization with the backend
 */
export class UserSyncService {
  private static instance: UserSyncService;
  private baseUrl: string;

  /**
   * Get singleton instance
   */
  public static getInstance(): UserSyncService {
    if (!UserSyncService.instance) {
      UserSyncService.instance = new UserSyncService();
      UserSyncService.instance.setLogging(true);
    }
    return UserSyncService.instance;
  }

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.baseUrl = authApiConfig.baseUrl;
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
   * Get authentication headers for API requests
   */
  private getAuthHeaders(token: string): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Sync user information with quodsi-fastapi
   * This creates or updates the user in the quodsi-fastapi database
   */
  public async syncUser(token: string): Promise<UserSyncResponse | null> {
    if (!token) {
      ComponentLogger.error(LOG_PREFIX, 'Cannot sync user: No token provided');
      return null;
    }

    try {
      ComponentLogger.log(LOG_PREFIX, 'Syncing user with quodsi-fastapi');
      ComponentLogger.log(LOG_PREFIX, `Using API endpoint: ${this.baseUrl}${authApiConfig.endpoints.syncUser}`);

      // Validate token before proceeding
      // Log token information (redacted)
      const tokenParts = token.split('.');
      if (tokenParts.length < 2) {
        ComponentLogger.error(LOG_PREFIX, 'Invalid token format - does not appear to be a valid JWT');
        return null;
      }

      // Extract and validate token payload
      try {
        const tokenPayload = JSON.parse(atob(tokenParts[1]));

        // Check for critical token properties
        if (!tokenPayload.exp || !tokenPayload.aud || !tokenPayload.iss) {
          ComponentLogger.error(LOG_PREFIX, 'Token missing critical properties (exp, aud, or iss)');
          return null;
        }

        // Check if token is expired
        const now = Math.floor(Date.now() / 1000); // Current time in seconds
        if (tokenPayload.exp && tokenPayload.exp < now) {
          ComponentLogger.error(LOG_PREFIX, 'Token is expired - cannot use for sync');
          return null;
        }

        // Log token payload with sensitive data redacted
        ComponentLogger.log(LOG_PREFIX, 'Token payload (redacted):', {
          aud: tokenPayload.aud,
          iss: tokenPayload.iss,
          exp: tokenPayload.exp,
          sub: tokenPayload.sub ? '***redacted***' : 'missing',
          name: tokenPayload.name ? '***redacted***' : 'missing',
          preferred_username: tokenPayload.preferred_username ? '***redacted***' : 'missing',
          tokenIssuedAt: tokenPayload.iat ? new Date(tokenPayload.iat * 1000).toISOString() : 'missing',
          tokenExpiresAt: tokenPayload.exp ? new Date(tokenPayload.exp * 1000).toISOString() : 'missing',
        });
      } catch (e) {
        ComponentLogger.error(LOG_PREFIX, 'Error parsing token payload:', e);
        return null; // Cannot proceed with invalid token
      }

      // Proceed with user sync API call
      ComponentLogger.log(LOG_PREFIX, 'Sending sync request to backend API');
      const response = await fetch(
        `${this.baseUrl}${authApiConfig.endpoints.syncUser}`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({
            // The token already contains all necessary user information
            // No additional data needed for basic sync
            current_time: new Date().toISOString(), // Include current time for debugging
            client_info: navigator.userAgent // Include client info for debugging
          })
        }
      );

      // Log the response status and headers (TypeScript compatible way)
      ComponentLogger.log(LOG_PREFIX, `Response status: ${response.status}`);

      // Log headers in a TypeScript compatible way
      const headerObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headerObj[key] = value;
      });
      ComponentLogger.log(LOG_PREFIX, `Response headers:`, headerObj);

      if (!response.ok) {
        const errorText = await response.text();
        ComponentLogger.error(
          LOG_PREFIX,
          'Failed to sync user with quodsi-fastapi',
          `Status: ${response.status}`,
          errorText
        );
        throw new Error(`Sync failed with status ${response.status}: ${errorText}`);
      }

      const userData: UserSyncResponse = await response.json();
      ComponentLogger.log(LOG_PREFIX, 'User synced successfully', userData);
      return userData;
    } catch (error) {
      // Create a standardized error and include original error details
      const authError = authErrorHandler.createUserSyncError(error);
      ComponentLogger.error(LOG_PREFIX, 'Error syncing user', authError, error);

      // Log network errors specifically
      if (error instanceof TypeError && error.message.includes('fetch')) {
        ComponentLogger.error(LOG_PREFIX, 'Network error - check API connectivity and CORS settings');
      }

      // Re-throw the error to propagate it up
      throw error;
    }
  }

  /**
   * Get user profile from quodsi-fastapi
   */
  public async getUserProfile(token: string): Promise<UserProfileResponse | null> {
    if (!token) {
      ComponentLogger.error(LOG_PREFIX, 'Cannot get user profile: No token provided');
      return null;
    }

    try {
      ComponentLogger.log(LOG_PREFIX, 'Getting user profile from quodsi-fastapi');

      const response = await fetch(
        `${this.baseUrl}${authApiConfig.endpoints.userProfile}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(token)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        ComponentLogger.error(
          LOG_PREFIX,
          'Failed to get user profile from quodsi-fastapi',
          `Status: ${response.status}`,
          errorText
        );
        throw new Error(`Get profile failed with status ${response.status}: ${errorText}`);
      }

      const profileData: UserProfileResponse = await response.json();
      ComponentLogger.log(LOG_PREFIX, 'User profile retrieved successfully');
      return profileData;
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error getting user profile', error);
      return null;
    }
  }

  /**
   * Create a user session on the backend
   */
  public async createSession(token: string): Promise<{ session_id: string } | null> {
    if (!token) {
      ComponentLogger.error(LOG_PREFIX, 'Cannot create session: No token provided');
      return null;
    }

    try {
      ComponentLogger.log(LOG_PREFIX, 'Creating user session');

      // Create a client info string instead of an object
      const clientInfo = `User-Agent: ${navigator.userAgent}, Platform: lucidchart_extension`;

      const response = await fetch(
        `${this.baseUrl}${authApiConfig.endpoints.createSession}`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({
            client_info: clientInfo // Send as string
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        ComponentLogger.error(
          LOG_PREFIX,
          'Failed to create session',
          `Status: ${response.status}`,
          errorText
        );
        return null;
      }

      const sessionData = await response.json();
      ComponentLogger.log(LOG_PREFIX, 'Session created successfully', sessionData);
      return sessionData;
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error creating session', error);
      return null;
    }
  }

  /**
   * Update a user session (mark activity)
   */
  public async updateSession(token: string, sessionId: string): Promise<boolean> {
    if (!token || !sessionId) {
      ComponentLogger.error(LOG_PREFIX, 'Cannot update session: Missing token or session ID');
      return false;
    }

    try {
      ComponentLogger.log(LOG_PREFIX, 'Updating user session activity');

      const response = await fetch(
        `${this.baseUrl}${authApiConfig.endpoints.updateSession}/${sessionId}`,
        {
          method: 'PATCH',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({
            activity_type: 'user_interaction'
          })
        }
      );

      if (!response.ok) {
        ComponentLogger.error(
          LOG_PREFIX,
          'Failed to update session',
          `Status: ${response.status}`
        );
        return false;
      }

      return true;
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error updating session', error);
      return false;
    }
  }

  /**
   * End a user session
   */
  public async endSession(token: string, sessionId: string): Promise<boolean> {
    if (!token || !sessionId) {
      ComponentLogger.error(LOG_PREFIX, 'Cannot end session: Missing token or session ID');
      return false;
    }

    try {
      ComponentLogger.log(LOG_PREFIX, 'Ending user session');

      const response = await fetch(
        `${this.baseUrl}${authApiConfig.endpoints.endSession}/${sessionId}`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({
            end_reason: 'user_logout'
          })
        }
      );

      if (!response.ok) {
        ComponentLogger.error(
          LOG_PREFIX,
          'Failed to end session',
          `Status: ${response.status}`
        );
        return false;
      }

      return true;
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error ending session', error);
      return false;
    }
  }
}

// Export singleton instance
export const userSyncService = UserSyncService.getInstance();
