/**
 * AuthErrorHandler
 * 
 * Standardizes error categorization and provides user-friendly 
 * error messages for authentication-related errors.
 */

/**
 * Authentication error codes enum
 */
export enum AuthErrorCode {
  // Authentication process errors
  SILENT_TOKEN_FAILURE = 'silent_token_failure',
  LOGIN_POPUP_FAILURE = 'login_popup_failure',
  LOGOUT_FAILURE = 'logout_failure',
  POPUP_BLOCKED = 'popup_blocked',
  
  // Token errors
  TOKEN_EXPIRED = 'token_expired',
  TOKEN_INVALID = 'token_invalid',
  
  // Session errors
  SESSION_TIMEOUT = 'session_timeout',
  SESSION_NOT_FOUND = 'session_not_found',
  
  // User action errors
  USER_CANCELLED = 'user_cancelled',
  USER_SYNC_FAILURE = 'user_sync_failure',
  
  // Connection errors
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  
  // Unknown/generic errors
  INITIALIZATION_ERROR = 'initialization_error',
  MSAL_ERROR = 'msal_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Authentication error object
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  originalError?: any;
  retryable: boolean;
  userActionNeeded: boolean;
}

/**
 * AuthErrorHandler service for managing authentication errors
 */
export class AuthErrorHandler {
  private static instance: AuthErrorHandler;

  /**
   * Get singleton instance
   */
  public static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Handle MSAL authentication errors
   */
  public handleMsalError(error: any): AuthError {
    const errorMessage = error?.message || 'Unknown MSAL error';
    
    // Handle user cancellation
    if (errorMessage.includes('AADB2C90091')) {
      return {
        code: AuthErrorCode.USER_CANCELLED,
        message: 'The operation was cancelled by the user.',
        originalError: error,
        retryable: true,
        userActionNeeded: false
      };
    }
    
    // Handle popup blocked
    if (errorMessage.toLowerCase().includes('popup') && 
        (errorMessage.toLowerCase().includes('blocked') || errorMessage.toLowerCase().includes('closed'))) {
      return {
        code: AuthErrorCode.POPUP_BLOCKED,
        message: 'The authentication popup was blocked. Please allow popups for this site and try again.',
        originalError: error,
        retryable: true,
        userActionNeeded: true
      };
    }
    
    // Handle token expired
    if (errorMessage.toLowerCase().includes('token expired') || 
        errorMessage.toLowerCase().includes('interaction_required')) {
      return {
        code: AuthErrorCode.TOKEN_EXPIRED,
        message: 'Your authentication session has expired. Please sign in again.',
        originalError: error,
        retryable: true,
        userActionNeeded: true
      };
    }
    
    // Handle network errors
    if (errorMessage.toLowerCase().includes('network') || 
        errorMessage.toLowerCase().includes('timeout') || 
        errorMessage.toLowerCase().includes('connection')) {
      return {
        code: AuthErrorCode.NETWORK_ERROR,
        message: 'A network error occurred during authentication. Please check your connection and try again.',
        originalError: error,
        retryable: true,
        userActionNeeded: false
      };
    }
    
    // When MSAL is not initialized correctly
    if (errorMessage.toLowerCase().includes('not initialized') || 
        errorMessage.toLowerCase().includes('initialization')) {
      return {
        code: AuthErrorCode.INITIALIZATION_ERROR,
        message: 'Authentication system is not properly initialized. Please refresh the page and try again.',
        originalError: error,
        retryable: true,
        userActionNeeded: false
      };
    }
    
    // Default MSAL error
    return {
      code: AuthErrorCode.MSAL_ERROR,
      message: `Authentication error: ${errorMessage}`,
      originalError: error,
      retryable: true,
      userActionNeeded: false
    };
  }

  /**
   * Handle API/service errors
   */
  public handleApiError(error: any): AuthError {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        code: AuthErrorCode.NETWORK_ERROR,
        message: 'Could not connect to the authentication service. Please check your connection and try again.',
        originalError: error,
        retryable: true,
        userActionNeeded: false
      };
    }
    
    // Handle HTTP errors (if status code is available)
    const status = error?.status || error?.statusCode;
    if (status) {
      // 401/403 - Unauthorized/Forbidden
      if (status === 401 || status === 403) {
        return {
          code: AuthErrorCode.TOKEN_INVALID,
          message: 'Your authentication session is invalid. Please sign in again.',
          originalError: error,
          retryable: true,
          userActionNeeded: true
        };
      }
      
      // 5xx - Server errors
      if (status >= 500) {
        return {
          code: AuthErrorCode.SERVER_ERROR,
          message: 'The authentication service encountered an error. Please try again later.',
          originalError: error,
          retryable: true,
          userActionNeeded: false
        };
      }
    }
    
    // Default API error
    const errorMessage = error?.message || 'Unknown API error';
    return {
      code: AuthErrorCode.UNKNOWN_ERROR,
      message: `Authentication service error: ${errorMessage}`,
      originalError: error,
      retryable: true,
      userActionNeeded: false
    };
  }

  /**
   * Handle session errors
   */
  public handleSessionError(error: any): AuthError {
    const errorMessage = error?.message || 'Unknown session error';
    
    // Handle session timeout
    if (errorMessage.toLowerCase().includes('timeout') || 
        errorMessage.toLowerCase().includes('expired')) {
      return {
        code: AuthErrorCode.SESSION_TIMEOUT,
        message: 'Your session has timed out due to inactivity. Please sign in again.',
        originalError: error,
        retryable: true,
        userActionNeeded: true
      };
    }
    
    // Handle missing session
    if (errorMessage.toLowerCase().includes('not found') || 
        errorMessage.toLowerCase().includes('missing')) {
      return {
        code: AuthErrorCode.SESSION_NOT_FOUND,
        message: 'Your session information could not be found. Please sign in again.',
        originalError: error,
        retryable: true,
        userActionNeeded: true
      };
    }
    
    // Default session error
    return {
      code: AuthErrorCode.UNKNOWN_ERROR,
      message: `Session error: ${errorMessage}`,
      originalError: error,
      retryable: true,
      userActionNeeded: true
    };
  }

  /**
   * Create user sync error
   */
  public createUserSyncError(error: any): AuthError {
    return {
      code: AuthErrorCode.USER_SYNC_FAILURE,
      message: 'Failed to synchronize your user information. Some features may be unavailable.',
      originalError: error,
      retryable: true,
      userActionNeeded: false
    };
  }

  /**
   * Create a generic error
   */
  public createGenericError(error: any): AuthError {
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'An unknown error occurred';
    
    return {
      code: AuthErrorCode.UNKNOWN_ERROR,
      message: `Authentication error: ${errorMessage}`,
      originalError: error,
      retryable: true,
      userActionNeeded: false
    };
  }

  /**
   * Get recovery action based on error code
   */
  public getRecoveryAction(error: AuthError): 'sign_in' | 'refresh' | 'retry' | 'wait' | 'contact_support' {
    switch (error.code) {
      case AuthErrorCode.TOKEN_EXPIRED:
      case AuthErrorCode.TOKEN_INVALID:
      case AuthErrorCode.SESSION_TIMEOUT:
      case AuthErrorCode.SESSION_NOT_FOUND:
        return 'sign_in';
        
      case AuthErrorCode.POPUP_BLOCKED:
      case AuthErrorCode.LOGIN_POPUP_FAILURE:
      case AuthErrorCode.LOGOUT_FAILURE:
      case AuthErrorCode.NETWORK_ERROR:
      case AuthErrorCode.USER_CANCELLED:
      case AuthErrorCode.INITIALIZATION_ERROR:
        return 'retry';
        
      case AuthErrorCode.SERVER_ERROR:
        return 'wait';
        
      case AuthErrorCode.SILENT_TOKEN_FAILURE:
        return 'refresh';
        
      default:
        return 'contact_support';
    }
  }
}

// Export singleton instance
export const authErrorHandler = AuthErrorHandler.getInstance();
