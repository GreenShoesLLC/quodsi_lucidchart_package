import { MessageTypes } from '../MessageTypes';

/**
 * User information structure with basic profile details
 */
export interface UserInfo {
    name: string;
    email: string;
    // Add other user profile fields as needed
}

/**
 * Auth action types to distinguish different auth operations
 */
export enum AuthActionType {
    PANEL_INIT = 'panelInit',
    STATUS_REQUEST = 'statusRequest',
    STATUS_RESPONSE = 'statusResponse',
    SIGN_IN = 'signIn',
    SIGN_OUT = 'signOut',
    COMPLETED = 'completed',
    ERROR = 'error',
}

export interface AuthData {
    // Panel initialization data
    panelType?: 'auth' | 'model';

    // Auth status data
    isAuthenticated?: boolean;
    userInfo?: UserInfo;
    // Auth completion data
    success?: boolean;

    // Error data
    error?: string;
    errorCode?: string;
    errorDescription?: string;
}
/**
 * Authentication-related message payloads
 */

export interface AuthPayloads {
    [MessageTypes.AUTH]: {
        type: AuthActionType;
        data?: AuthData;
    };

    // Use the same AuthData interface for REACT_APP_READY
    [MessageTypes.REACT_APP_READY]: AuthData;
}

