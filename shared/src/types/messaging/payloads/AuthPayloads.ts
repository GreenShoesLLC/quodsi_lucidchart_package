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
    SHOW_PANEL = 'showPanel',
    MODEL_PANEL_FOCUS = 'modelPanelFocus'
}

/**
 * Authentication-related message payloads
 */
export interface AuthPayloads {
    // [MessageTypes.AUTH_PANEL_INIT]: {
    //     panelType: 'auth' | 'model';
    // };

    // [MessageTypes.AUTH_STATUS_REQUEST]: {
    //     // No payload needed, just a request for status
    // };
    // [MessageTypes.SHOW_AUTH_PANEL]: {
    //     // No payload needed, just a request for status
    // };
    // [MessageTypes.MODEL_PANEL_FOCUS]: {
    //     // No payload needed, just a request for status
    // };
    
    // [MessageTypes.AUTH_STATUS_RESPONSE]: {
    //     isAuthenticated: boolean;
    //     userInfo?: UserInfo;
    // };

    // [MessageTypes.AUTH_SIGN_IN]: {
    //     // Optional parameters for the sign-in flow
    //     redirectUri?: string;
    // };

    // [MessageTypes.AUTH_SIGN_OUT]: {
    //     // No payload needed for sign out
    // };

    // [MessageTypes.AUTH_COMPLETED]: {
    //     success: boolean;
    //     userInfo?: UserInfo;
    //     error?: string;
    // };

    // [MessageTypes.AUTH_ERROR]: {
    //     error: string;
    //     errorCode?: string;
    //     errorDescription?: string;
    // };

    [MessageTypes.AUTH]: {
        type: AuthActionType;
        data?: {
            // Panel initialization data
            panelType?: 'auth' | 'model';

            // Auth status data
            isAuthenticated?: boolean;
            userInfo?: UserInfo;

            // Sign-in data
            redirectUri?: string;

            // Auth completion data
            success?: boolean;

            // Error data
            error?: string;
            errorCode?: string;
            errorDescription?: string;

            // Show panel data
            reason?: string;
        };
    };
}