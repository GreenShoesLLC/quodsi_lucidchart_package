import { JsonSerializable } from '../JsonTypes';
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
 * Authentication-related message payloads
 */
export interface AuthPayloads {
    [MessageTypes.AUTH_PANEL_INIT]: {
        panelType: 'auth' | 'model';
    };

    [MessageTypes.AUTH_STATUS_REQUEST]: {
        // No payload needed, just a request for status
    };

    [MessageTypes.AUTH_STATUS_RESPONSE]: {
        isAuthenticated: boolean;
        userInfo?: UserInfo;
    };

    [MessageTypes.AUTH_SIGN_IN]: {
        // Optional parameters for the sign-in flow
        redirectUri?: string;
    };

    [MessageTypes.AUTH_SIGN_OUT]: {
        // No payload needed for sign out
    };

    [MessageTypes.AUTH_COMPLETED]: {
        success: boolean;
        userInfo?: UserInfo;
        error?: string;
    };

    [MessageTypes.AUTH_ERROR]: {
        error: string;
        errorCode?: string;
        errorDescription?: string;
    };
}