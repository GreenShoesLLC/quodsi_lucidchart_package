import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/message-types';

/**
 * User information structure shared across auth messages
 */
export interface QuodsiUserInfo {
  /** B2C objectId (sub) */
  id: string;
  
  /** Primary sign-in address */
  email: string;
  
  /** Friendly name (optional) */
  displayName?: string;
}

/**
 * Sent after MSAL sign-in or sign-up finishes in popup.
 */
export interface AuthLoginSuccessMessage extends EnvelopeBase {
  type: EnvelopeMessageType.AUTH_LOGIN_SUCCESS;
  data: {
    /** JWT token from MSAL authentication */
    idToken: string;
    
    /** User information */
    user: QuodsiUserInfo;
    
    /** Flag indicating if this is a new user registration */
    newUser: boolean;
  };
}

/**
 * Sent when user clicks "Sign Out" or when silent token refresh fails.
 */
export interface AuthLogoutMessage extends EnvelopeBase {
  type: EnvelopeMessageType.AUTH_LOGOUT;
  data: Record<string, never>; // Empty object
}

/**
 * Sent upon successful completion of the B2C password-reset flow.
 */
export interface AuthPasswordResetMessage extends EnvelopeBase {
  type: EnvelopeMessageType.AUTH_PASSWORD_RESET;
  data: {
    /** Email address associated with the reset password */
    email: string;
  };
}

/**
 * Broadcast immediately after REACT_APP_READY and whenever login/logout occurs.
 */
export interface AuthStatusMessage extends EnvelopeBase {
  type: EnvelopeMessageType.AUTH_STATUS;
  data: {
    /** Whether the user is currently authenticated */
    isAuthenticated: boolean;
    
    /** User information if authenticated */
    user?: QuodsiUserInfo;
  };
}

/**
 * Sent when host blocks an operation because user is unauthenticated.
 */
export interface AuthRequiredMessage extends EnvelopeBase {
  type: EnvelopeMessageType.AUTH_REQUIRED;
  data: {
    /** Reason authentication is required */
    reason: 'not_authenticated' | 'session_expired';
  };
}

/**
 * Sent for non-PII auth failures.
 */
export interface AuthErrorMessage extends EnvelopeBase {
  type: EnvelopeMessageType.AUTH_ERROR;
  data: {
    /** Error code */
    code: string;
    
    /** Error message */
    message: string;
  };
}

/** Union type of all auth messages */
export type AuthMessage = 
  | AuthLoginSuccessMessage
  | AuthLogoutMessage
  | AuthPasswordResetMessage
  | AuthStatusMessage
  | AuthRequiredMessage
  | AuthErrorMessage;
