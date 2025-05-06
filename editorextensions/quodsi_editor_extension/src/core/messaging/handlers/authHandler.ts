import { EnvelopeBase, EnvelopeMessageType, QuodsiUserInfo } from '@quodsi/shared';
import { router, PanelRole } from '../index';

/**
 * Handler for authentication-related messages
 */
export class AuthHandler {
  /**
   * Handle messages related to authentication
   * 
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    console.info(`[EXT][AuthHandler] Checking if can handle message type: ${msg.type}`);
    
    switch (msg.type) {
      case EnvelopeMessageType.AUTH_LOGIN_SUCCESS:
        return AuthHandler.handleLoginSuccess(msg);
        
      case EnvelopeMessageType.AUTH_LOGOUT:
        return AuthHandler.handleLogout();
        
      case EnvelopeMessageType.AUTH_PASSWORD_RESET:
        return AuthHandler.handlePasswordReset(msg);
      
      case EnvelopeMessageType.REQUEST_AUTH_STATUS:
        return AuthHandler.handleRequestAuthStatus(msg);
        
      // Not an auth message
      default:
        return false;
    }
  }
  
  /**
   * Ensure channels are marked as ready before broadcasting messages
   * This is critical for message delivery
   */
  private static ensureChannelsReady(): void {
    console.info('[EXT][AuthHandler] Ensuring all channels are marked as ready');
    
    try {
      const channelManager = (router as any).getChannelManager?.();
      if (!channelManager) {
        console.warn('[EXT][AuthHandler][WARN] Cannot access channel manager');
        return;
      }
      
      // Mark both channels as ready
      ['auth', 'model'].forEach(role => {
        const channel = channelManager.getChannel(role as PanelRole);
        if (channel && channel.panel) {
          console.info(`[EXT][AuthHandler] Marking channel ${role} as ready`);
          channelManager.markChannelReady(role as PanelRole);
        } else {
          console.warn(`[EXT][AuthHandler][WARN] Cannot mark channel ${role} as ready - no panel`);
        }
      });
      
      console.info('[EXT][AuthHandler] Channels ready check complete');
    } catch (err) {
      console.error('[EXT][AuthHandler][ERROR] Error in ensureChannelsReady:', err);
    }
  }
  
  /**
   * Attempt to broadcast auth status directly to panels as a fallback mechanism
   * This is needed when the normal broadcast mechanism fails
   */
  private static attemptDirectPanelBroadcast(): void {
    console.info('[EXT][AuthHandler] Attempting direct panel broadcast as extra measure');
    
    try {
      if (typeof window !== 'undefined') {
        // Look for known panel instances in the window
        const extensionObj = (window as any).quodsiExtension;
        if (extensionObj && extensionObj.panels) {
          // Get current auth state from router
          const authState = router.getAuthState ? router.getAuthState() : null;
          
          // If we have auth state and panels, try to send directly
          if (authState) {
            // Try to send to both panels
            ['auth', 'model'].forEach(role => {
              const panel = extensionObj.panels[role];
              if (panel && typeof panel.relayToIframe === 'function') {
                console.info(`[EXT][AuthHandler] Sending auth status directly to ${role} panel`);
                try {
                  // Create direct auth status message
                  const directMsg = {
                    id: `direct_auth_${Date.now()}`,
                    type: EnvelopeMessageType.AUTH_STATUS,
                    source: 'host',
                    target: `${role}-iframe`,
                    version: '1.0',
                    data: authState
                  };
                  
                  // Send directly to panel
                  panel.relayToIframe(directMsg);
                  console.info(`[EXT][AuthHandler] Direct auth status sent to ${role} panel`);
                } catch (err) {
                  console.error(`[EXT][AuthHandler][ERROR] Error sending direct auth status to ${role} panel:`, err);
                }
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('[EXT][AuthHandler][ERROR] Error in direct panel broadcast:', err);
    }
  }
  
  /**
   * Handle successful login
   * 
   * @param msg AUTH_LOGIN_SUCCESS message
   * @returns True indicating message was handled
   */
  private static handleLoginSuccess(msg: EnvelopeBase): boolean {
    const data = msg.data as { idToken: string; user: QuodsiUserInfo; newUser: boolean };
    
    console.info('[EXT][AuthHandler] Processing login success with user:', data.user.email);
    console.info('[EXT][AuthHandler] User info details:', JSON.stringify(data.user));
    
    // IMPORTANT: Fix panel registration for the source panel
    // This ensures the panel that sent the message is still registered when we broadcast the response
    if (msg.source && msg.source.includes('iframe')) {
      // Extract the panel role from the source
      const role: PanelRole = msg.source.includes('auth') ? 'auth' : 'model';
      
      // Get the source panel instance from the source message
      console.info(`[EXT][AuthHandler] Retrieving panel reference for ${role} from message source: ${msg.source}`);
      
      // Attempt to get panel reference from the message context
      const sourcePanel = AuthHandler.getPanelFromMessage(msg);
      if (sourcePanel) {
        // Re-register the panel to ensure it's available when broadcasting
        console.info(`[EXT][AuthHandler] Re-registering ${role} panel to ensure valid reference for broadcasting`);
        router.registerChannel(role, sourcePanel);
        
        // Mark this channel as ready - it just sent us a message so it must be ready
        try {
          console.info(`[EXT][AuthHandler] Explicitly marking channel ${role} as ready`);
          const channelManager = (router as any).getChannelManager?.();
          if (channelManager && typeof channelManager.markChannelReady === 'function') {
            channelManager.markChannelReady(role);
          }
        } catch (e) {
          console.warn(`[EXT][AuthHandler][WARN] Error marking channel ${role} as ready:`, e);
        }
      } else {
        console.warn(`[EXT][AuthHandler][WARN] Could not retrieve panel reference from message context for ${role}`);
        
        // Fallback: Try to access panels through the ContentDockPanel instances
        AuthHandler.attemptPanelRegistrationFallback(role);
      }
    }
    
    // Store auth state in localStorage for cross-panel access
    try {
      console.info('[EXT][AuthHandler] Storing auth state in localStorage for cross-panel communication');
      localStorage.setItem('quodsi_auth_status', 'true');
      localStorage.setItem('quodsi_auth_timestamp', Date.now().toString());
      localStorage.setItem('quodsi_auth_user', JSON.stringify(data.user));
    } catch (e) {
      console.warn('[EXT][AuthHandler][WARN] Error storing auth state in localStorage:', e);
      // Ignore localStorage errors
    }
    
    // IMPORTANT: Explicitly attempt to register the model panel before broadcasting
    console.info('[EXT][AuthHandler] Ensuring model panel is registered before broadcasting');
    const modelPanel = router.retrieveFromGlobalRegistry('model');
    if (modelPanel) {
      console.info('[EXT][AuthHandler] Re-registering model panel for consistent auth broadcasting');
      router.registerChannel('model', modelPanel);
      
      // Also mark the model panel as ready
      try {
        console.info('[EXT][AuthHandler] Explicitly marking model channel as ready');
        const channelManager = (router as any).getChannelManager?.();
        if (channelManager && typeof channelManager.markChannelReady === 'function') {
          channelManager.markChannelReady('model');
        }
      } catch (e) {
        console.warn('[EXT][AuthHandler][WARN] Error marking model channel as ready:', e);
      }
    }
    
    // Ensure all channels are marked as ready before broadcasting
    AuthHandler.ensureChannelsReady();
    
    // Update the router's auth state using the new public method
    router.updateAuthState(true, data.user);
    
    console.info('[EXT][AuthHandler] Auth state updated, broadcasting to panels');
    
    // TODO: Sync with backend using the idToken
    console.info('[EXT][AuthHandler] Login successful. New user?', data.newUser);
    
    // Broadcast the auth status immediately instead of using setTimeout
    // This is safer in environments where setTimeout may not be available
    console.info('[EXT][AuthHandler] Broadcasting auth status after login');
    
    // Broadcast using multiple methods for reliability
    AuthHandler.attemptDirectPanelBroadcast(); // Call direct broadcast first
    router.broadcastAuthStatus(); // Then standard broadcast
    
    // Additional direct delivery to RightDockPanel for extra reliability
    try {
      const channelManager = (router as any).getChannelManager?.();
      if (channelManager && typeof channelManager.forceDeliverMessage === 'function') {
        console.info('[EXT][AuthHandler] Using forceDeliverMessage for AUTH_STATUS to model panel');
        const authState = router.getAuthState();
        channelManager.forceDeliverMessage('model', EnvelopeMessageType.AUTH_STATUS, authState);
      }
    } catch (err) {
      console.error('[EXT][AuthHandler][ERROR] Error in direct delivery to model panel:', err);
    }
    
    return true;
  }
  
  /**
   * Handle logout
   * 
   * @returns True indicating message was handled
   */
  private static handleLogout(): boolean {
    console.info('[EXT][AuthHandler] Processing logout request');
    
    // Clear localStorage auth state
    try {
      console.info('[EXT][AuthHandler] Clearing auth state from localStorage');
      localStorage.removeItem('quodsi_auth_status');
      localStorage.removeItem('quodsi_auth_timestamp');
      localStorage.removeItem('quodsi_auth_user');
    } catch (e) {
      console.warn('[EXT][AuthHandler][WARN] Error clearing auth state from localStorage:', e);
      // Ignore localStorage errors
    }
    
    // Update router's auth state using the new public method
    router.clearAuthState();
    
    console.info('[EXT][AuthHandler] Auth state cleared, broadcasting to panels');
    
    // Clean up any auth-dependent resources
    console.info('[EXT][AuthHandler] User logged out successfully');
    
    // Update any services that need to know about authentication
    // ...
    
    return true;
  }
  
  /**
   * Handle password reset
   * 
   * @param msg AUTH_PASSWORD_RESET message
   * @returns True indicating message was handled
   */
  private static handlePasswordReset(msg: EnvelopeBase): boolean {
    const data = msg.data as { email: string };
    
    console.info('[EXT][AuthHandler] Processing password reset for:', data.email);
    
    // No special handling needed for now
    
    return true;
  }
  
  /**
   * Handle requests for authentication status
   * 
   * @param msg REQUEST_AUTH_STATUS message
   * @returns True indicating message was handled
   */
  private static handleRequestAuthStatus(msg: EnvelopeBase): boolean {
    console.info('[EXT][AuthHandler] Processing request for auth status');
    
    // Extract panel role from the message source
    const role: PanelRole = msg.source.includes('auth') ? 'auth' : 'model';
    console.info(`[EXT][AuthHandler] Auth status requested from ${role} panel`);
    
    // Since we received a message from this panel, we should mark it as ready
    try {
      console.info(`[EXT][AuthHandler] Panel ${role} sent a message - marking it as ready`);
      const channelManager = (router as any).getChannelManager?.();
      if (channelManager && typeof channelManager.markChannelReady === 'function') {
        channelManager.markChannelReady(role);
      }
    } catch (e) {
      console.warn(`[EXT][AuthHandler][WARN] Error marking channel ${role} as ready:`, e);
    }
    
    // Ensure all channels are ready
    AuthHandler.ensureChannelsReady();
    
    // Check if localStorage has auth status (as an additional check)
    let localStorageAuth = false;
    try {
      const storedAuthStatus = localStorage.getItem('quodsi_auth_status');
      if (storedAuthStatus === 'true') {
        console.info('[EXT][AuthHandler] Found authenticated status in localStorage');
        localStorageAuth = true;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // Get current auth state from router
    const authState = router.getAuthState();
    console.info('[EXT][AuthHandler] Current router auth state:', authState);
    
    // If we have inconsistency, use localStorage as fallback if it indicates authentication
    if (localStorageAuth && (!authState || !authState.isAuthenticated)) {
      console.info('[EXT][AuthHandler] Auth state inconsistency detected - localStorage indicates authenticated but router does not');
      
      // Try to get user info from localStorage
      try {
        const userInfoJson = localStorage.getItem('quodsi_auth_user');
        if (userInfoJson) {
          const userInfo = JSON.parse(userInfoJson);
          
          // Update router auth state from localStorage
          console.info('[EXT][AuthHandler] Updating router auth state from localStorage');
          router.updateAuthState(true, userInfo);
          
          // Direct broadcast to requesting panel
          console.info(`[EXT][AuthHandler] Broadcasting updated auth state to ${role} panel`);
          router.broadcastAuthStatus();
          
          return true;
        }
      } catch (e) {
        console.warn('[EXT][AuthHandler] Error parsing user info from localStorage:', e);
      }
    }
    
    // No inconsistency or unable to recover user info - just broadcast current state
    console.info(`[EXT][AuthHandler] Broadcasting current auth state to ${role} panel`);
    
    // Use both direct and standard broadcast methods for reliability
    AuthHandler.attemptDirectPanelBroadcast();
    router.broadcastAuthStatus();
    
    return true;
  }
  
  /**
   * Attempt to get the panel reference from the message context
   * This is a helper method to retrieve the panel that sent the message
   */
  private static getPanelFromMessage(msg: EnvelopeBase): any {
    // This is a bit of a hack to get the panel reference from the context
    // In a real implementation, you'd want a more robust way to do this
    
    // Check if the message has a "_panelRef" property added by ContentDockPanel
    if ((msg as any)._panelRef) {
      return (msg as any)._panelRef;
    }
    
    // Check if the message source is in the route context
    // This would require modifications to the ContentDockPanel class
    
    return null;
  }
  
  /**
   * Fallback method to attempt panel registration by looking for panels in the DOM
   */
  private static attemptPanelRegistrationFallback(role: PanelRole): void {
    console.info(`[EXT][AuthHandler] Attempting fallback panel registration for ${role}`);
    
    try {
      // Try to access the router's channel manager directly
      const routerObj = router as any;
      if (!routerObj.channelManager) {
        console.warn('[EXT][AuthHandler][WARN] Router does not have a channelManager property');
        return;
      }
      
      // Get the channel state
      const channel = routerObj.channelManager.getChannel(role);
      if (!channel) {
        console.warn(`[EXT][AuthHandler][WARN] Channel for ${role} not found`);
        return;
      }
      
      // If the channel has a panel but it's somehow not being used
      if (channel.panel) {
        console.info(`[EXT][AuthHandler] Channel ${role} already has a panel, re-registering it`);
        router.registerChannel(role, channel.panel);
        return;
      }
      
      // If we get here, we need to try to find the panel another way
      // This approach depends on the specific structure of your application
      
      // For example, in a Lucidchart extension, you might be able to find panels in the global scope
      if (typeof window !== 'undefined') {
        // Look for known panel instances in the window
        const extensionObj = (window as any).quodsiExtension;
        if (extensionObj && extensionObj.panels) {
          const panel = extensionObj.panels[role];
          if (panel) {
            console.info(`[EXT][AuthHandler] Found ${role} panel in global scope, re-registering it`);
            router.registerChannel(role, panel);
            return;
          }
        }
      }
      
      console.warn(`[EXT][AuthHandler][WARN] Failed to find panel for ${role} in fallback registration`);
    } catch (err) {
      console.error(`[EXT][AuthHandler][ERROR] Error in fallback panel registration:`, err);
    }
  }
}