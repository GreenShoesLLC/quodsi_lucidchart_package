/**
 * AuthMessagingService
 * 
 * Handles communication between the React application and the extension
 * for authentication-related messages.
 */

import { ExtensionMessaging, MessageTypes, UserInfo, AuthActionType, ComponentLogger } from '@quodsi/shared';
import { AuthError } from './AuthErrorHandler';
import { getMsalInstanceFromContext } from '../auth/msal-helpers';
import { IPublicClientApplication } from '@azure/msal-browser';

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
 * Callback type for auth state updates
 */
type AuthStateUpdateCallback = (isAuthenticated: boolean, userInfo: UserInfo | null) => void;

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
  private authStateUpdateCallback: AuthStateUpdateCallback | null = null;

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

        case AuthActionType.ERROR:
          ComponentLogger.log(LOG_PREFIX, 'Processing AUTH error:', payload.data);
          if (this.errorCallback && payload.data?.error) {
            this.errorCallback(payload.data.error);
          }
          break;

        case AuthActionType.RECHECK_AUTH:
          ComponentLogger.log(LOG_PREFIX, 'Processing AUTH recheck request');
          this.handleRecheckAuth();
          // setTimeout(() => {
          //   console.log("[AuthMessagingService] Performing secondary auth check");
          //   this.checkAndUpdateAuth();
          // }, 500);
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
   * Handle RECHECK_AUTH message
   */
  private handleRecheckAuth(): void {
    ComponentLogger.log(LOG_PREFIX, 'Handling RECHECK_AUTH message');

    // Function to attempt SSO check with retry logic
    const attemptSsoCheck = (retries = 3) => {
      const msalInstance = getMsalInstanceFromContext();
      if (!msalInstance) {
        if (retries > 0) {
          ComponentLogger.log(LOG_PREFIX, "MSAL not ready, retrying in 500ms...");
          setTimeout(() => attemptSsoCheck(retries - 1), 500);
        } else {
          ComponentLogger.error(LOG_PREFIX, "Failed to get MSAL instance after retries");
          if (this.errorCallback) {
            this.errorCallback("Failed to verify authentication state");
          }
        }
        return;
      }

      // Get accounts (if any)
      const currentAccounts = msalInstance.getAllAccounts();

      if (currentAccounts.length > 0) {
        // We already have an account, use it directly
        const account = currentAccounts[0];
        ComponentLogger.log(LOG_PREFIX, "Found existing account, using directly");

        const userInfo = {
          name: account.name || "Unknown User",
          email: account.username,
        };

        // Update global auth state FIRST
        if (this.authStateUpdateCallback) {
          ComponentLogger.log(LOG_PREFIX, "Updating global auth state via callback");
          this.authStateUpdateCallback(true, userInfo);
        } else {
          ComponentLogger.warn(LOG_PREFIX, "No authStateUpdateCallback registered to update global state");
        }

        // Then broadcast authentication state to the extension
        ComponentLogger.log(LOG_PREFIX, "Broadcasting authenticated state to extension");
        this.broadcastAuthStatus(true, userInfo);

        // Dispatch custom event to directly update component state
        ComponentLogger.log(LOG_PREFIX, "Dispatching direct auth state update event");
        try {
          window.dispatchEvent(new CustomEvent('quodsi:auth:statechange', {
            detail: { isAuthenticated: true, userInfo }
          }));
        } catch (error) {
          ComponentLogger.error(LOG_PREFIX, "Error dispatching custom event:", error);
        }
      } else {
        // No accounts found - user is not authenticated
        ComponentLogger.log(LOG_PREFIX, "No accounts found during recheck");

        // Update global auth state
        if (this.authStateUpdateCallback) {
          this.authStateUpdateCallback(false, null);
        }

        // Then broadcast unauthenticated state
        this.broadcastAuthStatus(false, null);
      }
    };

    // Start the check process
    attemptSsoCheck();

    // Schedule additional checks to handle possible race conditions
    setTimeout(() => {
      ComponentLogger.log(LOG_PREFIX, "Performing secondary auth check");
      this.checkAndUpdateAuth();
    }, 500);

    setTimeout(() => {
      ComponentLogger.log(LOG_PREFIX, "Performing tertiary auth check");
      this.checkAndUpdateAuth();
    }, 1500);
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
   * Register callback for auth state updates
   */
  public onAuthStateUpdate(callback: AuthStateUpdateCallback): void {
    ComponentLogger.log(LOG_PREFIX, "Registering auth state update callback");
    this.authStateUpdateCallback = callback;
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

  // In AuthMessagingService.ts, add this method
  public checkAndUpdateAuth(): void {
    const msalInstance = getMsalInstanceFromContext();
    if (!msalInstance) {
      return;
    }

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      const account = accounts[0];
      const userInfo = {
        name: account.name || "Unknown User",
        email: account.username,
      };

      console.log("[AuthMessagingService] Directly updating auth state with account:", userInfo);

      // Call the update callback
      if (this.authStateUpdateCallback) {
        this.authStateUpdateCallback(true, userInfo);
      }
    }
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
}

// Export singleton instance
export const authMessagingService = AuthMessagingService.getInstance();