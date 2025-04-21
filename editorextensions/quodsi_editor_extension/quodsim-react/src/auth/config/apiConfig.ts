/**
 * apiConfig.ts
 * 
 * Configuration for API endpoints and authentication-related services
 */

/**
 * Core API configuration
 * Used for simulation and model management
 */
export const coreApiConfig = {
  baseUrl: process.env.REACT_APP_API_BASE_URL || "https://quodsi-api-dev.azurewebsites.net",
  endpoints: {
    models: "/api/models",
    simulations: "/api/simulations",
    results: "/api/results"
  }
};

/**
 * Authentication API configuration
 * Used for FastAPI user synchronization and session management
 */
export const authApiConfig = {
  // Base URL for the quodsi-fastapi service
  baseUrl: process.env.REACT_APP_QUODSI_FASTAPI_URL || 'http://localhost:8000',
  
  // API endpoints for quodsi-fastapi
  endpoints: {
    // User synchronization endpoint - creates/updates users in quodsi-fastapi database
    syncUser: '/api/v1/auth/sync',
    
    // Token validation
    validateToken: '/api/v1/auth/validate',
    
    // Session management
    createSession: '/api/v1/auth/session',
    updateSession: '/api/v1/auth/session', // + /{sessionId}
    endSession: '/api/v1/auth/session',    // + /{sessionId}
    
    // User profile
    userProfile: '/api/v1/users/me'
  }
};
