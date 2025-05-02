// panels/AuthPanel.ts
import {
    PanelLocation,
    EditorClient,
    Panel
} from 'lucid-extension-sdk';
import {
    ExtensionMessaging,
    isValidMessage,
    JsonSerializable,
    MessageTypes,
    UserInfo,
    AuthActionType
} from '@quodsi/shared';
import { panelManager } from '../managers/PanelManager';
// Session storage keys
const SESSION_AUTH_STATE = 'quodsi_auth_state';
const SESSION_USER_INFO = 'quodsi_user_info';
const SESSION_LAST_ACTIVE = 'quodsi_last_active';

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * AuthPanel is responsible for handling user authentication in a left-side panel.
 * It communicates with the React application to manage the authentication flow
 * using Azure AD B2C and controls the visibility of the ModelPanel based on
 * authentication state.
 */
export class AuthPanel extends Panel {
    private static readonly LOG_PREFIX = '[AuthPanel]';
    private loggingEnabled: boolean = false;
    private messaging: ExtensionMessaging;
    private reactAppReady: boolean = false;
    private isAuthenticated: boolean = false;
    private userInfo: UserInfo | null = null;
    private sessionCheckInterval: any; // For periodic session checking
    private _isShown: boolean = false;
    constructor(client: EditorClient) {
        super(client, {
            title: 'Quodsi',
            url: 'quodsim-react/index.html', // Same React app
            location: PanelLocation.ContentDock,
            iconUrl: 'https://lucid.app/favicon.ico', // Temporary icon, should be replaced
            width: 300
        });
        this.log('Auth Panel Constructor called');
        this.messaging = ExtensionMessaging.getInstance();
        this.setupMessageHandlers();
        this.loadSessionState();
        // this.startSessionMonitoring();
        this.log('Auth Panel initialized');
    }

    /**
     * Enables or disables logging
     */
    public setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
        this.log(`Logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Returns whether logging is currently enabled
     */
    private isLoggingEnabled(): boolean {
        return this.loggingEnabled;
    }

    /**
     * Log a message if logging is enabled
     */
    private log(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.log(`${AuthPanel.LOG_PREFIX} ${message}`, ...args);
        }
    }

    /**
     * Log an error message if logging is enabled
     */
    private logError(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.error(`${AuthPanel.LOG_PREFIX} ${message}`, ...args);
        }
    }
    
    /**
     * Sets up message handlers for authentication-related messages
     */
    // Replace the existing REACT_APP_READY message handler in AuthPanel.ts

    private setupMessageHandlers(): void {
        this.messaging.onMessage(MessageTypes.REACT_APP_READY, (payload) => {
            this.log('REACT_APP_READY message received in auth panel with payload:', payload);

            // Check if the message includes authentication data
            if (payload && typeof payload.isAuthenticated === 'boolean') {
                this.log('Received auth state from React app:', {
                    isAuthenticated: payload.isAuthenticated,
                    hasUserInfo: !!payload.userInfo
                });

                // Update our authentication state if needed
                if (payload.isAuthenticated && !this.isAuthenticated) {
                    this.log('Updating panel auth state from React app');
                    this.isAuthenticated = payload.isAuthenticated;
                    this.userInfo = payload.userInfo || null;

                    // Save the updated state to session storage
                    this.saveSessionState();
                }
            } else {
                this.log('No auth data in REACT_APP_READY message, loading from session');
                // When the React app is ready, check if we need to reload session state
                // This ensures we have fresh state when the panel is reopened
                this.loadSessionState();
            }

            this.handleReactReady();
        });

        // Auth message handler for consolidated AUTH message type
        this.messaging.onMessage(MessageTypes.AUTH, (payload) => {
            if (!payload || !payload.type) {
                this.logError('Invalid AUTH message received:', payload);
                return;
            }

            switch (payload.type) {
                case AuthActionType.STATUS_REQUEST:
                    this.handleAuthStatusRequest();
                    break;

                case AuthActionType.SIGN_IN:
                    this.handleAuthSignIn();
                    break;

                case AuthActionType.SIGN_OUT:
                    this.handleAuthSignOut();
                    break;

                case AuthActionType.COMPLETED:
                    this.handleAuthCompleted(payload.data);
                    break;

                case AuthActionType.ERROR:
                    this.handleAuthError(payload.data);
                    break;

                default:
                    this.log(`Unhandled AUTH action type: ${payload.type}`);
            }
        });
    }

    /**
 * Resets the authentication state for this panel
 * This can be called when a user logs out or switches accounts
 */
    public resetAuthentication(): void {
        this.log('Resetting authentication state');
        this.reactAppReady = false;
        this.isAuthenticated = false;
        this.userInfo = null;

        // Notify the React app about the auth reset
        this.sendAuthMessage(AuthActionType.STATUS_RESPONSE, {
            isAuthenticated: false,
            userInfo: null
        });

        // If the panel is currently visible, re-initialize it
        if (this.isShown()) {
            this.handleReactReady();
        }
    }
    /**
     * Reset the reactAppReady flag, forcing reinitialization
     * on the next REACT_APP_READY message
     */
    public resetReactAppReady(): void {
        this.log('Resetting reactAppReady flag');
        this.reactAppReady = false;
    }

    /**
     * Checks if the panel is currently being shown
     */
    public isShown(): boolean {
        return this._isShown;
    }
    /**
     * Loads authentication state from session storage
     */
    /**
     * Safely gets an item from sessionStorage with fallbacks
     * @param key The key to retrieve
     * @returns The value or null if not available
     */
    private getSessionItem(key: string): string | null {
        try {
            // Try window.sessionStorage first (most extension environments)
            if (typeof window !== 'undefined' && window.sessionStorage) {
                return window.sessionStorage.getItem(key);
            }
            
            // Fallback to global sessionStorage if available
            if (typeof sessionStorage !== 'undefined') {
                return sessionStorage.getItem(key);
            }
            
            this.log(`Storage API not available for key: ${key}`);
            return null;
        } catch (error) {
            this.logError(`Error accessing session storage for key: ${key}`, error);
            return null;
        }
    }
    
    /**
     * Safely sets an item in sessionStorage with fallbacks
     * @param key The key to set
     * @param value The value to store
     */
    private setSessionItem(key: string, value: string): void {
        try {
            // Try window.sessionStorage first (most extension environments)
            if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.setItem(key, value);
                return;
            }
            
            // Fallback to global sessionStorage if available
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(key, value);
                return;
            }
            
            this.log(`Storage API not available, couldn't save key: ${key}`);
        } catch (error) {
            this.logError(`Error setting session storage for key: ${key}`, error);
        }
    }
    
    /**
     * Safely removes an item from sessionStorage with fallbacks
     * @param key The key to remove
     */
    private removeSessionItem(key: string): void {
        try {
            // Try window.sessionStorage first (most extension environments)
            if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.removeItem(key);
                return;
            }
            
            // Fallback to global sessionStorage if available
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem(key);
                return;
            }
            
            this.log(`Storage API not available, couldn't remove key: ${key}`);
        } catch (error) {
            this.logError(`Error removing session storage for key: ${key}`, error);
        }
    }

    private loadSessionState(): void {
        try {
            // Check if we have auth state in session storage
            const authState = this.getSessionItem(SESSION_AUTH_STATE);
            const userInfoStr = this.getSessionItem(SESSION_USER_INFO);
            const lastActiveStr = this.getSessionItem(SESSION_LAST_ACTIVE);
            
            if (authState && userInfoStr && lastActiveStr) {
                const isAuthenticated = authState === 'true';
                const userInfo = JSON.parse(userInfoStr) as UserInfo;
                const lastActive = parseInt(lastActiveStr, 10);
                
                // Check if the session is still valid (not timed out)
                const now = Date.now();
                if (now - lastActive < SESSION_TIMEOUT) {
                    this.isAuthenticated = isAuthenticated;
                    this.userInfo = userInfo;
                    this.updateLastActive();
                    this.log('Loaded valid session state from storage', {
                        isAuthenticated,
                        userInfo
                    });
                } else {
                    // Session has timed out
                    this.log('Session has timed out, clearing state');
                    this.clearSessionState();
                }
            } else {
                this.log('No session state found in storage');
            }
        } catch (error) {
            this.logError('Error loading session state', error);
            this.clearSessionState();
        }
    }

    /**
     * Saves the current authentication state to session storage
     */
    private saveSessionState(): void {
        try {
            this.setSessionItem(SESSION_AUTH_STATE, this.isAuthenticated.toString());
            this.setSessionItem(SESSION_USER_INFO, this.userInfo ? JSON.stringify(this.userInfo) : '');
            this.updateLastActive();
            this.log('Saved session state to storage');
        } catch (error) {
            this.logError('Error saving session state', error);
        }
    }

    /**
     * Updates the last active timestamp
     */
    private updateLastActive(): void {
        this.setSessionItem(SESSION_LAST_ACTIVE, Date.now().toString());
    }

    /**
     * Clears all session state
     */
    private clearSessionState(): void {
        this.isAuthenticated = false;
        this.userInfo = null;
        
        try {
            this.removeSessionItem(SESSION_AUTH_STATE);
            this.removeSessionItem(SESSION_USER_INFO);
            this.removeSessionItem(SESSION_LAST_ACTIVE);
            this.log('Cleared session state');
        } catch (error) {
            this.logError('Error clearing session state', error);
        }
    }

    /**
     * Starts periodic session monitoring to check for timeouts
     */
    // private startSessionMonitoring(): void {
    //     // Check the session every minute
    //     this.sessionCheckInterval = window.setInterval(() => {
    //         if (this.isAuthenticated) {
    //             const lastActiveStr = sessionStorage.getItem(SESSION_LAST_ACTIVE);
    //             if (lastActiveStr) {
    //                 const lastActive = parseInt(lastActiveStr, 10);
    //                 const now = Date.now();
                    
    //                 // If session has timed out
    //                 if (now - lastActive > SESSION_TIMEOUT) {
    //                     this.log('Session timed out during monitoring');
    //                     this.clearSessionState();
                        
    //                     // Notify the React app
    //                     this.sendAuthMessage(AuthActionType.ERROR, {
    //                         error: 'Your session has timed out due to inactivity. Please sign in again.',
    //                         errorCode: 'session_timeout'
    //                     });
    //                 }
    //             }
    //         }
    //     }, 60000); // Check every minute
    // }

    /**
     * Stops session monitoring
     */
    // private stopSessionMonitoring(): void {
    //     if (this.sessionCheckInterval) {
    //         window.clearInterval(this.sessionCheckInterval);
    //         this.sessionCheckInterval = null;
    //     }
    // }

    /**
     * Handles the initialization message from the React app
     */
    private async handleReactReady(): Promise<void> {
        this.log('handleReactReady in AuthPanel');
        
        // If the app was already initialized, we're likely reopening the panel
        // We still need to send the initialization messages
        if (this.reactAppReady) {
            this.log('React app already ready, but panel might be reopening - sending init messages');
        }
        
        this.reactAppReady = true;

        // Tell React this is the AuthPanel
        this.sendAuthMessage(AuthActionType.PANEL_INIT, {
            panelType: 'auth'
        });
        
        // Always send the auth status, whether authenticated or not
        // This ensures the React app has the current state
        this.sendAuthMessage(AuthActionType.STATUS_RESPONSE, {
            isAuthenticated: this.isAuthenticated,
            userInfo: this.userInfo || undefined
        });
        
        this.log('Sent auth panel init with authentication state:', { 
            isAuthenticated: this.isAuthenticated,
            hasUserInfo: !!this.userInfo 
        });
    }
    
    /**
     * Responds to authentication status requests
     */
    private handleAuthStatusRequest(): void {
        this.log('Auth status requested');
        this.updateLastActive();
        this.sendAuthMessage(AuthActionType.STATUS_RESPONSE, {
            isAuthenticated: this.isAuthenticated,
            userInfo: this.userInfo || undefined
        });
    }
    
    /**
     * Logs sign-in initiation
     */
    private handleAuthSignIn(): void {
        this.log('Auth sign-in initiated');
        this.updateLastActive();
        // The React app will handle the actual sign-in with MSAL
    }
    
    /**
     * Handles sign-out events
     */
    private handleAuthSignOut(): void {
        this.log('Auth sign-out initiated');
        this.isAuthenticated = false;
        this.userInfo = null;
        
        // Clear session state
        this.clearSessionState();
    }
    
    /**
     * Handles successful authentication completion
     */
    private handleAuthCompleted(data: any): void {
        this.log('Auth completed:', data);
        this.isAuthenticated = data.success;
        this.userInfo = data.userInfo || null;

        // Save the authentication state
        if (data.success) {
            this.saveSessionState();
            // Notify ModelPanel of authentication state change via PanelManager
            panelManager.resetModelPanelAuthentication();
            // Broadcast authentication state to all panels
            // This is a workaround since we can't modify extension.ts
            this.sendAuthMessage(AuthActionType.STATUS_RESPONSE, {
                isAuthenticated: this.isAuthenticated,
                userInfo: this.userInfo || undefined 
            });
        } else {
            this.clearSessionState();
        }
    }
    
    /**
     * Handles authentication errors
     */
    private handleAuthError(data: any): void {
        this.logError('Auth error:', data.error);
        
        // If this is a serious error that affects the authentication state
        if (data.errorCode === 'token_expired' || 
            data.errorCode === 'session_timeout' || 
            data.errorCode === 'unauthorized') {
            
            this.isAuthenticated = false;
            this.userInfo = null;
            this.clearSessionState();
        }
    }
    
    /**
     * Sends an AUTH message with the specified action type and payload
     */
    protected sendAuthMessage(
        type: AuthActionType,
        data?: any
    ): void {
        this.sendTypedMessage(MessageTypes.AUTH, {
            type,
            data: data || null
        });
    }
    
    /**
     * Sends a typed message to the React app
     */
    protected sendTypedMessage<T extends MessageTypes>(
        type: T,
        payload?: any
    ): void {
        const message = {
            messagetype: type,
            data: payload ?? null
        } as JsonSerializable;

        this.sendMessage(message);
    }

    /**
     * Processes messages from the React app
     */
    protected messageFromFrame(message: any): void {
        if (!isValidMessage(message)) {
            this.logError('Invalid message format:', message);
            this.sendAuthMessage(AuthActionType.ERROR, {
                error: 'Invalid message format',
                errorCode: 'INVALID_MESSAGE_FORMAT'
            });
            return;
        }

        this.messaging.handleIncomingMessage(message);
    }
    
    /**
     * Called when the iframe has been removed from the DOM
     * We override this method to clean up resources
     */
    protected frameClosed(): void {
        this.log('AuthPanel frame closed, cleaning up resources');
        // this.stopSessionMonitoring();
        super.frameClosed();
    }
    
    /**
     * Called when the iframe has been constructed and loaded
     * We override this method to set up initial state
     */
    // protected frameLoaded(): void {
    //     this.log('AuthPanel frame loaded');
    //     super.frameLoaded();
        
    //     // Send panel type initialization message immediately when the frame loads
    //     // This ensures the React app knows which panel it is, even after panel reopening
    //     if (this.reactAppReady) {
    //         this.sendAuthMessage(AuthActionType.PANEL_INIT, {
    //             panelType: 'auth'
    //         });
            
    //         // Also send auth status if authenticated
    //         if (this.isAuthenticated && this.userInfo) {
    //             this.sendAuthMessage(AuthActionType.STATUS_RESPONSE, {
    //                 isAuthenticated: this.isAuthenticated,
    //                 userInfo: this.userInfo
    //             });
    //         }
    //     }
    // }
}