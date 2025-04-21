/**
 * QuodsiFastApiService
 * 
 * Service for interacting with the quodsi-fastapi backend.
 * This is a thin wrapper around the UserSyncService for backward compatibility.
 * 
 * @deprecated Use UserSyncService directly for new code
 */

import { userSyncService } from './UserSyncService';
import type { UserSyncResponse, UserProfileResponse } from './UserSyncService';

/**
 * QuodsiFastApiService class for interacting with quodsi-fastapi
 * @deprecated Use UserSyncService directly for new code
 */
export class QuodsiFastApiService {
  /**
   * Constructor
   */
  constructor() {
    console.warn(
      '[QuodsiFastApiService] This service is deprecated. ' +
      'Use UserSyncService directly for new code.'
    );
  }

  /**
   * Sync user information with quodsi-fastapi
   * This creates or updates the user in the quodsi-fastapi database
   * 
   * @param token Access token from Microsoft Entra ID
   * @returns User information if successful, null otherwise
   * @deprecated Use UserSyncService.syncUser() instead
   */
  async syncUser(token: string): Promise<UserSyncResponse | null> {
    return userSyncService.syncUser(token);
  }

  /**
   * Get user profile from quodsi-fastapi
   * 
   * @param token Access token from Microsoft Entra ID
   * @returns User profile if successful, null otherwise
   * @deprecated Use UserSyncService.getUserProfile() instead
   */
  async getUserProfile(token: string): Promise<UserProfileResponse | null> {
    return userSyncService.getUserProfile(token);
  }
}

// Re-export interfaces for backward compatibility
export type { UserSyncResponse, UserProfileResponse };

// Create a singleton instance of the service
export const quodsiFastApiService = new QuodsiFastApiService();
