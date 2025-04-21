/**
 * sessionConfig.ts
 * 
 * Configuration for authentication session management
 * Defines timeout periods, refresh intervals, and storage keys
 */

/**
 * Session timeout (30 minutes)
 * Period of inactivity after which the user is automatically logged out
 */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Token refresh buffer (5 minutes before expiration)
 * How long before token expiration to attempt refresh
 */
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Session check interval (1 minute)
 * How often to check for session timeout
 */
export const SESSION_CHECK_INTERVAL_MS = 60 * 1000;

/**
 * Session storage keys for authentication state
 */
export const SESSION_STORAGE_KEYS = {
  AUTH_STATE: 'quodsi_auth_state',
  USER_INFO: 'quodsi_user_info',
  LAST_ACTIVE: 'quodsi_last_active',
  ACCESS_TOKEN: 'quodsi_access_token',
  TOKEN_EXPIRATION: 'quodsi_token_expiration'
};
