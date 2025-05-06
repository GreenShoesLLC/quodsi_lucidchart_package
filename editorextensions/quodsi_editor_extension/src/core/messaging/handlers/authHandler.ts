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
    console.info(`[AuthHandler] Checking if can handle message type: ${msg.type}`);
    
    switch (msg.type) {
      case EnvelopeMessageType.AUTH_LOGIN_SUCCESS:
        return AuthHandler.handleLoginSuccess(msg);
        
      case EnvelopeMessageType.AUTH_LOGOUT:
        return AuthHandler.handleLogout();
        
      case EnvelopeMessageType.AUTH_PASSWORD_RESET:
        return AuthHandler.handlePasswordReset(msg);
        
      // Not an auth message
      default:
        return false;
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
    
    console.info('[AuthHandler] Processing login success with user:', data.user.email);
    console.info('[AuthHandler] User info details:', JSON.stringify(data.user));
    
    // IMPORTANT: Fix panel registration for the source panel
    // This ensures the panel that sent the message is still registered when we broadcast the response
    if (msg.source && msg.source.includes('iframe')) {
      // Extract the panel role from the source
      const role: PanelRole = msg.source.includes('auth') ? 'auth' : 'model';
      
      // Get the source panel instance from the source message
      console.info(`[AuthHandler] Retrieving panel reference for ${role} from message source: ${msg.source}`);
      
      // Attempt to get panel reference from the message context
      const sourcePanel = AuthHandler.getPanelFromMessage(msg);
      if (sourcePanel) {
        // Re-register the panel to ensure it's available when broadcasting
        console.info(`[AuthHandler] Re-registering ${role} panel to ensure valid reference for broadcasting`);
        router.registerChannel(role, sourcePanel);
      } else {
        console.warn(`[AuthHandler] Could not retrieve panel reference from message context for ${role}`);
        
        // Fallback: Try to access panels through the ContentDockPanel instances
        AuthHandler.attemptPanelRegistrationFallback(role);
      }
    }
    
    // Update the router's auth state using the new public method
    router.updateAuthState(true, data.user);
    
    console.info('[AuthHandler] Auth state updated, broadcasting to panels');
    
    // TODO: Sync with backend using the idToken
    console.info('[AuthHandler] Login successful. New user?', data.newUser);
    
    // Broadcast the auth status immediately instead of using setTimeout
    // This is safer in environments where setTimeout may not be available
    console.info('[AuthHandler] Broadcasting auth status after login');
    router.broadcastAuthStatus();
    
    return true;
  }
  
  /**
   * Handle logout
   * 
   * @returns True indicating message was handled
   */
  private static handleLogout(): boolean {
    console.info('[AuthHandler] Processing logout request');
    
    // Update router's auth state using the new public method
    router.clearAuthState();
    
    console.info('[AuthHandler] Auth state cleared, broadcasting to panels');
    
    // Clean up any auth-dependent resources
    console.info('[AuthHandler] User logged out successfully');
    
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
    
    console.info('[AuthHandler] Processing password reset for:', data.email);
    
    // No special handling needed for now
    
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
    console.info(`[AuthHandler] Attempting fallback panel registration for ${role}`);
    
    try {
      // Try to access the router's channel manager directly
      const routerObj = router as any;
      if (!routerObj.channelManager) {
        console.warn('[AuthHandler] Router does not have a channelManager property');
        return;
      }
      
      // Get the channel state
      const channel = routerObj.channelManager.getChannel(role);
      if (!channel) {
        console.warn(`[AuthHandler] Channel for ${role} not found`);
        return;
      }
      
      // If the channel has a panel but it's somehow not being used
      if (channel.panel) {
        console.info(`[AuthHandler] Channel ${role} already has a panel, re-registering it`);
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
            console.info(`[AuthHandler] Found ${role} panel in global scope, re-registering it`);
            router.registerChannel(role, panel);
            return;
          }
        }
      }
      
      console.warn(`[AuthHandler] Failed to find panel for ${role} in fallback registration`);
    } catch (err) {
      console.error(`[AuthHandler] Error in fallback panel registration:`, err);
    }
  }
}
