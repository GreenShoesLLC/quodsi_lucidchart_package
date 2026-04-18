import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';

/**
 * User information structure shared across auth messages
 */
export interface QuodsiUserInfo {
  /** Kinde user ID (sub claim) */
  id: string;

  /** User email address (from user_profile endpoint) */
  email: string;

  /** Friendly display name (from user_profile endpoint) */
  displayName?: string;

  /** Kinde organization code (from access token org_code claim) */
  orgCode?: string;
}

/**
 * Sent after Kinde sign-in or sign-up finishes via Lucid platform OAuth.
 */
export interface AuthLoginSuccessMessage extends EnvelopeBase {
  type: EnvelopeMessageType.AUTH_LOGIN_SUCCESS;
  data: {
    /** JWT token from Kinde authentication */
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
  | AuthStatusMessage
  | AuthRequiredMessage
  | AuthErrorMessage;
