/**
 * AuthMessagingService
 * 
 * Handles communication between the React application and the extension
 * for authentication-related messages.
 */

import { ExtensionMessaging, MessageTypes, UserInfo } from '@quodsi/shared';
import { AuthError } from './AuthErrorHandler';

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
    }
    return AuthMessagingService.instance;
  }

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.messaging = ExtensionMessaging.getInstance();
    this.setupMessageListeners();
  }

  /**
   * Set up message listeners
   */
  private setupMessageListeners(): void {
    // Listen for authentication status requests
    this.messaging.onMessage(MessageTypes.AUTH_STATUS_REQUEST, () => {
      console.log('[AuthMessagingService] Received AUTH_STATUS_REQUEST');
      if (this.statusRequestCallback) {
        this.statusRequestCallback();
      }
    });

    // Listen for show auth panel requests
    this.messaging.onMessage(MessageTypes.SHOW_AUTH_PANEL, (data) => {
      console.log('[AuthMessagingService] Received SHOW_AUTH_PANEL');
      if (this.showAuthPanelCallback) {
        this.showAuthPanelCallback(data);
      }
    });

    // Listen for model panel focus events
    this.messaging.onMessage(MessageTypes.MODEL_PANEL_FOCUS, (data) => {
      console.log('[AuthMessagingService] Received MODEL_PANEL_FOCUS');
      if (this.modelPanelFocusCallback) {
        this.modelPanelFocusCallback(data);
      }
    });

    // Listen for error messages
    this.messaging.onMessage(MessageTypes.ERROR, (data) => {
      console.log('[AuthMessagingService] Received ERROR', data);
      if (this.errorCallback && data?.error) {
        this.errorCallback(data.error);
      }
    });
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
    console.log('[AuthMessagingService] Sending AUTH_STATUS_RESPONSE', { isAuthenticated, userInfo });
    this.messaging.sendMessage(MessageTypes.AUTH_STATUS_RESPONSE, {
      isAuthenticated,
      userInfo: userInfo || undefined
    });
  }

  /**
   * Send authentication completed notification
   */
  public sendAuthCompleted(success: boolean, userInfo: UserInfo | null): void {
    console.log('[AuthMessagingService] Sending AUTH_COMPLETED', { success, userInfo });
    this.messaging.sendMessage(MessageTypes.AUTH_COMPLETED, {
      success,
      userInfo: userInfo || undefined
    });
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
    
    console.log('[AuthMessagingService] Sending AUTH_ERROR', { errorMessage, errorCode });
    this.messaging.sendMessage(MessageTypes.AUTH_ERROR, {
      error: errorMessage,
      errorCode
    });
  }

  /**
   * Send sign-in initiated notification
   */
  public sendSignInStarted(): void {
    console.log('[AuthMessagingService] Sending AUTH_SIGN_IN');
    this.messaging.sendMessage(MessageTypes.AUTH_SIGN_IN);
  }

  /**
   * Send sign-out notification
   */
  public sendSignOut(): void {
    console.log('[AuthMessagingService] Sending AUTH_SIGN_OUT');
    this.messaging.sendMessage(MessageTypes.AUTH_SIGN_OUT);
  }

  /**
   * Send show auth panel request
   */
  public sendShowAuthPanel(reason?: string): void {
    console.log('[AuthMessagingService] Sending SHOW_AUTH_PANEL', { reason });
    this.messaging.sendMessage(MessageTypes.SHOW_AUTH_PANEL, { reason });
  }

  /**
   * Send model panel focus notification
   */
  public sendModelPanelFocus(): void {
    console.log('[AuthMessagingService] Sending MODEL_PANEL_FOCUS');
    this.messaging.sendMessage(MessageTypes.MODEL_PANEL_FOCUS);
  }
}

// Export singleton instance
export const authMessagingService = AuthMessagingService.getInstance();
