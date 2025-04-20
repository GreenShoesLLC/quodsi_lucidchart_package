/**
 * Configuration for quodsi-fastapi integration
 * Defines the API endpoints and configuration values
 */

export const quodsiFastApiConfig = {
  // Base URL for the quodsi-fastapi service
  // In production, this should be set through environment variables
  baseUrl: process.env.REACT_APP_QUODSI_FASTAPI_URL || 'http://localhost:8000',
  
  // API endpoints for quodsi-fastapi
  endpoints: {
    // User synchronization endpoint - creates/updates users in quodsi-fastapi database
    syncUser: '/api/v1/auth/sync',
    
    // Additional endpoints to be added in future steps
    validateToken: '/api/v1/auth/validate',
    createSession: '/api/v1/auth/session',
    updateSession: '/api/v1/auth/session', // + /{sessionId}
    endSession: '/api/v1/auth/session',    // + /{sessionId}
    userProfile: '/api/v1/users/me'
  }
};
