/**
 * QuodsiFastApiService
 * 
 * Service for interacting with the quodsi-fastapi backend.
 * This service provides methods for user synchronization and authentication.
 */

import { quodsiFastApiConfig } from '../config/apiConfig';

/**
 * Interface for user sync response
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
 * QuodsiFastApiService class for interacting with quodsi-fastapi
 */
export class QuodsiFastApiService {
  private baseUrl: string;

  /**
   * Constructor
   */
  constructor() {
    this.baseUrl = quodsiFastApiConfig.baseUrl;
  }

  /**
   * Get headers with authentication token
   * @param token Access token from Microsoft Entra ID
   * @returns Headers object with authorization
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
   * 
   * @param token Access token from Microsoft Entra ID
   * @returns User information if successful, null otherwise
   */
  async syncUser(token: string): Promise<UserSyncResponse | null> {
    if (!token) {
      console.error('Cannot sync user: No token provided');
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}${quodsiFastApiConfig.endpoints.syncUser}`, 
        {
          method: 'POST',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({
            // The token already contains all necessary user information
            // No additional data needed for basic sync
          })
        }
      );

      if (!response.ok) {
        // Log the error but don't throw
        // This allows authentication to continue even if this step fails
        console.error(
          'Failed to sync user with quodsi-fastapi', 
          `Status: ${response.status}`, 
          await response.text()
        );
        return null;
      }

      const userData: UserSyncResponse = await response.json();
      console.log('User successfully synced with quodsi-fastapi', userData);
      return userData;
    } catch (error) {
      // Log error but don't block authentication
      console.error('Error syncing user with quodsi-fastapi', error);
      return null;
    }
  }
}

// Create a singleton instance of the service
export const quodsiFastApiService = new QuodsiFastApiService();
