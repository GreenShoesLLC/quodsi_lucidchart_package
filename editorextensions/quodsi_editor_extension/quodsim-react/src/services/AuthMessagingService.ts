/**
 * AuthMessagingService
 * 
 * Handles communication between the React application and the extension
 * for authentication-related messages.
 */

import { ExtensionMessaging, MessageTypes, UserInfo, AuthActionType, ComponentLogger } from '@quodsi/shared';
import { AuthError } from './AuthErrorHandler';

// Define a constant for the logger prefix
const LOG_PREFIX = '[AuthMessagingService]';

/**
 * Callback type for authentication events
 */
type AuthEventCallback = () => void;

/**
 * Callback type for authentication status requests
 */
type StatusRequestCallback = () => void;

/**
 * Callback type for panel messages
 */
type PanelMessageCallback = (data?: any) => void;

/**
 * Callback type for error messages
 */
type ErrorMessageCallback = (error: string) => void;

/**
 * AuthMessagingService handles communication with the extension host
 */
export class AuthMessagingService {
  private static instance: AuthMessagingService;
  private messaging: ExtensionMessaging;

  // Event callbacks
  private statusRequestCallback: StatusRequestCallback | null = null;
  private showAuthPanelCallback: PanelMessageCallback | null = null;
  private modelPanelFocusCallback: PanelMessageCallback | null = null;
  private errorCallback: ErrorMessageCallback | null = null;

  /**
   * Get singleton instance
   */
  public static getInstance(): AuthMessagingService {
    if (!AuthMessagingService.instance) {
      AuthMessagingService.instance = new AuthMessagingService();
      AuthMessagingService.instance.setLogging(true);
    }
    
    return AuthMessagingService.instance;
  }

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.messaging = ExtensionMessaging.getInstance();
    // Set logging to disabled by default
    this.setLogging(false);
    this.setupMessageListeners();
  }

  /**
   * Enable or disable logging for this service
   */
  public setLogging(enabled: boolean): void {
    ComponentLogger.setEnabled(LOG_PREFIX, enabled);
  }

  /**
   * Set up message listeners
   */
  private setupMessageListeners(): void {
    // Listen for consolidated AUTH messages
    this.messaging.onMessage(MessageTypes.AUTH, (payload) => {
      if (!payload || !payload.type) {
        ComponentLogger.error(LOG_PREFIX, 'Received invalid AUTH message:', payload);
        return;
      }

      ComponentLogger.log(LOG_PREFIX, `Received AUTH message with type: ${payload.type}`);

      switch (payload.type) {
        case AuthActionType.STATUS_REQUEST:
          ComponentLogger.log(LOG_PREFIX, 'Processing AUTH status request');
          if (this.statusRequestCallback) {
            this.statusRequestCallback();
          }
          break;

        case AuthActionType.SHOW_PANEL:
          ComponentLogger.log(LOG_PREFIX, 'Processing AUTH show panel request');
          if (this.showAuthPanelCallback) {
            this.showAuthPanelCallback(payload.data);
          }
          break;

        case AuthActionType.MODEL_PANEL_FOCUS:
          ComponentLogger.log(LOG_PREFIX, 'Processing AUTH model panel focus');
          if (this.modelPanelFocusCallback) {
            this.modelPanelFocusCallback(payload.data);
          }
          break;

        case AuthActionType.ERROR:
          ComponentLogger.log(LOG_PREFIX, 'Processing AUTH error:', payload.data);
          if (this.errorCallback && payload.data?.error) {
            this.errorCallback(payload.data.error);
          }
          break;

        default:
          ComponentLogger.log(LOG_PREFIX, `Unhandled AUTH action type: ${payload.type}`);
      }
    });

    // Still listen for regular error messages (non-auth errors)
    // this.messaging.onMessage(MessageTypes.ERROR, (data) => {
    //   ComponentLogger.log(LOG_PREFIX, 'Received ERROR', data);
    //   if (this.errorCallback && data?.error) {
    //     this.errorCallback(data.error);
    //   }
    // });
  }

  /**
   * Register callback for authentication status requests
   */
  public onAuthStatusRequest(callback: StatusRequestCallback): void {
    this.statusRequestCallback = callback;
  }

  /**
   * Register callback for show auth panel events
   */
  public onShowAuthPanel(callback: PanelMessageCallback): void {
    this.showAuthPanelCallback = callback;
  }

  /**
   * Register callback for model panel focus events
   */
  public onModelPanelFocus(callback: PanelMessageCallback): void {
    this.modelPanelFocusCallback = callback;
  }

  /**
   * Register callback for error messages
   */
  public onError(callback: ErrorMessageCallback): void {
    this.errorCallback = callback;
  }

  /**
   * Send authentication status response
   */
  public sendAuthStatus(isAuthenticated: boolean, userInfo: UserInfo | null): void {
    ComponentLogger.log(LOG_PREFIX, 'Sending AUTH status response', { isAuthenticated, userInfo });
    this.messaging.sendMessage(MessageTypes.AUTH, {
      type: AuthActionType.STATUS_RESPONSE,
      data: {
        isAuthenticated,
        userInfo: userInfo || undefined
      }
    });
  }

  /**
   * Send authentication completed notification
   */
  public sendAuthCompleted(success: boolean, userInfo: UserInfo | null): void {
    ComponentLogger.log(LOG_PREFIX, 'Sending AUTH completed', { success, userInfo });

    // Send auth completed message
    this.messaging.sendMessage(MessageTypes.AUTH, {
      type: AuthActionType.COMPLETED,
      data: {
        success,
        userInfo: userInfo || undefined
      }
    });

    // Also broadcast auth status if successful
    if (success) {
      this.broadcastAuthStatus(true, userInfo);
    }
  }

  /**
   * Send authentication error notification
   */
  public sendAuthError(error: AuthError | string): void {
    const errorMessage = typeof error === 'string' 
      ? error 
      : error.message;
    
    const errorCode = typeof error === 'string' 
      ? undefined 
      : error.code;
    
    ComponentLogger.log(LOG_PREFIX, 'Sending AUTH error', { errorMessage, errorCode });
    this.messaging.sendMessage(MessageTypes.AUTH, {
      type: AuthActionType.ERROR,
      data: {
        error: errorMessage,
        errorCode
      }
    });
  }

  /**
   * Broadcasts authentication status to all panels
   */
  public broadcastAuthStatus(isAuthenticated: boolean, userInfo: UserInfo | null): void {
    ComponentLogger.log(LOG_PREFIX, 'Broadcasting auth status to all panels:', { isAuthenticated });

    // Just send to the global messaging instance - all panels will receive it
    this.messaging.sendMessage(MessageTypes.AUTH, {
      type: AuthActionType.STATUS_RESPONSE,
      data: {
        isAuthenticated,
        userInfo: userInfo || undefined
      }
    });
  }

  /**
   * Send sign-in initiated notification
   */
  public sendSignInStarted(): void {
    ComponentLogger.log(LOG_PREFIX, 'Sending AUTH sign in');
    this.messaging.sendMessage(MessageTypes.AUTH, {
      type: AuthActionType.SIGN_IN
    });
  }

  /**
   * Send sign-out notification
   */
  public sendSignOut(): void {
    ComponentLogger.log(LOG_PREFIX, 'Sending AUTH sign out');
    this.messaging.sendMessage(MessageTypes.AUTH, {
      type: AuthActionType.SIGN_OUT
    });
  }

  /**
   * Send show auth panel request
   */
  public sendShowAuthPanel(reason?: string): void {
    ComponentLogger.log(LOG_PREFIX, 'Sending AUTH show panel', { reason });
    this.messaging.sendMessage(MessageTypes.AUTH, {
      type: AuthActionType.SHOW_PANEL,
      data: { reason }
    });
  }

  /**
   * Send model panel focus notification
   */
  public sendModelPanelFocus(): void {
    ComponentLogger.log(LOG_PREFIX, 'Sending AUTH model panel focus');
    this.messaging.sendMessage(MessageTypes.AUTH, {
      type: AuthActionType.MODEL_PANEL_FOCUS
    });
  }
}

// Export singleton instance
export const authMessagingService = AuthMessagingService.getInstance();
