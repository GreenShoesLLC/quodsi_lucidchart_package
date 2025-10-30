/**
 * index.ts
 * 
 * Re-exports all authentication configuration
 * Provides a central import point for authentication settings
 */

// MSAL Configuration
export {
  createMsalConfig,
  getRedirectUri,
  isInIframe,
  getCacheSettings,
  getLoggerOptions
} from './msalConfig';

// Authentication Policies
export {
  tenantConfig,
  b2cPolicies,
  apiScopes,
  buildAuthority,
  createLoginRequest,
  loginRequest,
  passwordResetRequest,
  profileEditRequest
} from './authPolicies';

// Session Configuration
export {
  SESSION_TIMEOUT_MS,
  TOKEN_REFRESH_BUFFER_MS,
  SESSION_CHECK_INTERVAL_MS,
  SESSION_STORAGE_KEYS
} from './sessionConfig';
