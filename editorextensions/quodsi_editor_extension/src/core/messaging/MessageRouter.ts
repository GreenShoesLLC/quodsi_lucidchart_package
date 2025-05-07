// import { v4 as uuid } from 'uuid';
import { 
  EnvelopeBase, 
  EnvelopeMessageType, 
  isEnvelope, 
  SubscriptionTier, 
  SubscriptionStatus,
  QuodsiUserInfo
} from '@quodsi/shared';
import { PanelRole, LogEntry } from './types';
import { ChannelManager } from './ChannelManager';
import { RouterState } from './RouterState';
import { RoutablePanel } from './RoutablePanel';
import { MessageHandlers } from './handlers'; // Pre-load handlers at initialization time

/**
 * MessageRouter singleton that handles all communication
 */
export class MessageRouter {
  private static instance: MessageRouter;
  
  private channelManager: ChannelManager;
  private state: RouterState;
  private devLogging = false;
  private logBuffer: LogEntry[] = [];

  /**
   * Get the singleton instance of the MessageRouter
   */
  public static getInstance(): MessageRouter {
    if (!MessageRouter.instance) {
      MessageRouter.instance = new MessageRouter();
    }
    return MessageRouter.instance;
  }

  // Private constructor for singleton pattern
  private constructor() {
    // Initialize the state manager
    this.state = new RouterState();
    
    // Initialize the channel manager with a logging function
    this.channelManager = new ChannelManager(this.logDebug.bind(this));
    
    // Initialize the global debugging log
    if (typeof window !== 'undefined') {
      (window as any).__msgLog = this.logBuffer;
    }
  }
  
  /**
   * Generate a simple ID instead of using uuid
   */
  private generateId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }
  
  /**
   * Get the current authentication state for external use
   * Used by direct broadcasting mechanisms
   */
  public getAuthState(): any {
    return this.state.getAuthState();
  }
  
  /**
   * Get access to the channel manager (for direct diagnostics)
   * This allows panels to directly interact with the channel manager
   */
  public getChannelManager(): ChannelManager {
    return this.channelManager;
  }
  
  /**
   * Register a panel with the router
   */
  public registerChannel(role: PanelRole, panel: RoutablePanel): void {
    console.log(`[EXT][MessageRouter] registerChannel called for ${role}`);
    
    // Before registering, ensure we don't have a null panel
    if (!panel) {
      console.error(`[EXT][MessageRouter][ERROR] Cannot register null panel for ${role}`);
      return;
    }
    
    // Verify that the panel has the required relayToIframe method
    if (typeof panel.relayToIframe !== 'function') {
      console.error(`[EXT][MessageRouter][ERROR] Panel for ${role} doesn't have relayToIframe method`);
      return;
    }
    
    this.channelManager.registerChannel(role, panel);
    
    // After registering, store the panel in the global registry for recovery
    this.storeInGlobalRegistry(role, panel);
  }
  
  /**
   * Store a panel reference in the global registry for recovery
   */
  private storeInGlobalRegistry(role: PanelRole, panel: RoutablePanel): void {
    if (typeof window !== 'undefined') {
      // Create the global object if it doesn't exist
      if (!(window as any).quodsiExtension) {
        (window as any).quodsiExtension = { panels: {} };
      } else if (!(window as any).quodsiExtension.panels) {
        (window as any).quodsiExtension.panels = {};
      }
      
      // Store this panel
      (window as any).quodsiExtension.panels[role] = panel;
      console.log(`[EXT][MessageRouter] Stored ${role} panel in global registry`);
    }
  }
  
  /**
   * Try to retrieve a panel from the global registry
   */
  public retrieveFromGlobalRegistry(role: PanelRole): RoutablePanel | null {
    if (typeof window !== 'undefined' && 
        (window as any).quodsiExtension && 
        (window as any).quodsiExtension.panels) {
      
      const panel = (window as any).quodsiExtension.panels[role];
      if (panel && typeof panel.relayToIframe === 'function') {
        console.log(`[EXT][MessageRouter] Retrieved ${role} panel from global registry`);
        return panel;
      }
    }
    
    console.log(`[EXT][MessageRouter] No ${role} panel found in global registry`);
    return null;
  }
  
  /**
   * Ensure channel has a valid panel, trying to recover if needed
   */
  public ensureChannelHasPanel(role: PanelRole): boolean {
    // Get the current channel state
    const channel = this.channelManager.getChannel(role);
    if (!channel) {
      console.error(`[EXT][MessageRouter][ERROR] No channel found for ${role}`);
      return false;
    }
    
    // If the channel already has a valid panel, we're good
    if (channel.panel && typeof channel.panel.relayToIframe === 'function') {
      console.log(`[EXT][MessageRouter] Channel ${role} already has a valid panel`);
      return true;
    }
    
    // Try to recover the panel from the global registry
    const panel = this.retrieveFromGlobalRegistry(role);
    if (panel) {
      this.registerChannel(role, panel);
      return true;
    }
    
    console.error(`[EXT][MessageRouter][ERROR] Could not recover panel for ${role}`);
    return false;
  }
  
  /**
   * Send a message to a specific target or broadcast to all panels
   */
  public send(target: PanelRole | 'broadcast', msg: EnvelopeBase): void {
    // Set source to 'host' if not already set
    if (msg.source !== 'host') {
      msg.source = 'host';
    }
    
    // Set target based on parameter
    msg.target = target === 'broadcast' ? 'broadcast' : `${target}-iframe`;
    
    // Ensure id exists
    if (!msg.id) {
      msg.id = this.generateId();
    }

    this.logDebug(`Sending message: ${msg.type} to ${target}`);

    if (target === 'broadcast') {
      // For broadcast, ensure all channels have panels first
      this.channelManager.getAllRoles().forEach(role => {
        // Try to ensure the channel has a panel before sending
        this.ensureChannelHasPanel(role);
        this.channelManager.enqueueOrSend(role, { ...msg });
      });
    } else {
      // For direct messages, ensure the target channel has a panel
      this.ensureChannelHasPanel(target);
      this.channelManager.enqueueOrSend(target, msg);
    }
  }
  
  /**
   * Process a message received from an iframe
   */
  public receive(msg: EnvelopeBase): void {
    console.log('[EXT][MessageRouter] Received message:', msg.type, msg);
    
    if (!isEnvelope(msg)) {
      this.logDebug(`Received invalid message format`);
      return;
    }

    this.logDebug(`Received message: ${msg.type} from ${msg.source}`);

    // Check for panel reference in the message - but only if we don't already have a valid panel
    if ((msg as any)._panelRef) {
      const role: PanelRole = msg.source.includes('auth') ? 'auth' : 'model';

      // Only register if we don't already have a valid panel
      const channel = this.channelManager.getChannel(role);
      if (!channel || !channel.panel) {
        console.log(`[EXT][MessageRouter] Found panel reference in message, registering for ${role}`);
        this.registerChannel(role, (msg as any)._panelRef);
      }
    }

    // Handle special REACT_APP_READY message
    if (msg.type === EnvelopeMessageType.REACT_APP_READY) {
      console.log('[EXT][MessageRouter] Handling REACT_APP_READY message');
      this.handleReactAppReady(msg);
      return;
    }
    
    // For all other messages, use pre-loaded MessageHandlers
    // Rather than dynamic import which can cause timing issues
    try {
      console.log('[EXT][MessageRouter] Forwarding message to MessageHandlers');
      if (MessageHandlers.handleMessage(msg)) {
        console.log('[EXT][MessageRouter] Message was handled by a handler');
        this.logDebug(`Message ${msg.type} handled by MessageHandlers`);
      } else {
        console.log('[EXT][MessageRouter] Message was NOT handled by any handler:', msg.type);
        this.logDebug(`Unhandled message type: ${msg.type}`);
      }
    } catch (err) {
      console.error(`[EXT][MessageRouter][ERROR] Error handling message:`, err);
      this.logDebug(`Error handling message: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  /**
   * Handle the REACT_APP_READY message
   */
  private handleReactAppReady(msg: EnvelopeBase): void {
    const data = msg.data as any;
    const role = data.panel as PanelRole;
    
    if (!role) {
      this.logDebug(`Invalid panel role in REACT_APP_READY`);
      return;
    }
    
    console.log(`[EXT][MessageRouter] Marking channel ${role} as ready`);
    
    // If we have a panel reference in the message, register it
    if ((msg as any)._panelRef) {
      console.log(`[EXT][MessageRouter] Registering panel from REACT_APP_READY message for ${role}`);
      this.registerChannel(role, (msg as any)._panelRef);
    }
    
    // Mark channel as ready
    this.channelManager.markChannelReady(role);
    
    // Update auth state if provided
    if (data.isAuthenticated !== undefined) {
      this.state.updateAuthState({
        isAuthenticated: data.isAuthenticated,
        user: data.user
      });
    }
    
    // Ensure the channel has a panel before flushing
    console.log(`[EXT][MessageRouter] Flushing queue for ${role}:`, {
      queueSize: this.channelManager.getChannel(role)?.queue.length,
      hasPanel: this.ensureChannelHasPanel(role),
      isReady: this.channelManager.isChannelReady(role)
    });
    
    // Flush queued messages
    this.channelManager.flushQueue(role);
    
    // Send current auth and subscription state
    this.sendAuthStatus(role);
    this.sendSubscriptionStatus(role);
  }
  
  /**
   * Send current auth status to a specific panel
   */
  private sendAuthStatus(role: PanelRole): void {
    this.send(role, {
      id: this.generateId(),
      type: EnvelopeMessageType.AUTH_STATUS,
      source: 'host',
      target: `${role}-iframe`,
      version: '1.0',
      data: this.state.getAuthState()
    });
  }
  
  /**
   * Broadcast auth status to all panels
   */
  public broadcastAuthStatus(): void {
    console.log('[EXT][MessageRouter] Broadcasting auth status:', this.state.getAuthState());
    
    // Ensure all channels have panels before broadcasting
    this.channelManager.getAllRoles().forEach(role => {
      this.ensureChannelHasPanel(role);
    });
    
    this.send('broadcast', {
      id: this.generateId(),
      type: EnvelopeMessageType.AUTH_STATUS,
      source: 'host',
      target: 'broadcast',
      version: '1.0',
      data: this.state.getAuthState()
    });
  }
  
  /**
   * Send current subscription status to a specific panel
   */
  private sendSubscriptionStatus(role: PanelRole): void {
    // Only send if we have subscription data
    if (this.state.hasSubscriptionData()) {
      this.send(role, {
        id: this.generateId(),
        type: EnvelopeMessageType.SUBSCRIPTION_STATUS,
        source: 'host',
        target: `${role}-iframe`,
        version: '1.0',
        data: this.state.getSubscriptionState()
      });
    }
  }
  
  /**
   * Broadcast subscription status to all panels
   */
  private broadcastSubscriptionStatus(): void {
    // Only broadcast if we have subscription data
    if (this.state.hasSubscriptionData()) {
      this.send('broadcast', {
        id: this.generateId(),
        type: EnvelopeMessageType.SUBSCRIPTION_STATUS,
        source: 'host',
        target: 'broadcast',
        version: '1.0',
        data: this.state.getSubscriptionState()
      });
    }
  }
  
  /**
   * Update subscription state and broadcast to all panels
   */
  public updateSubscription(
    tier: SubscriptionTier,
    status: SubscriptionStatus,
    expiresAt?: string,
    featureFlags?: Record<string, boolean>
  ): void {
    this.state.updateSubscriptionState({
      tier,
      status,
      expiresAt,
      featureFlags
    });
    
    this.broadcastSubscriptionStatus();
  }
  
  /**
   * Update authentication state and broadcast to all panels
   * 
   * @param isAuthenticated Whether the user is authenticated
   * @param user User information (if authenticated)
   */
  public updateAuthState(isAuthenticated: boolean, user?: QuodsiUserInfo): void {
    console.log('[EXT][MessageRouter] updateAuthState called:', isAuthenticated, user);
    
    this.state.updateAuthState({
      isAuthenticated,
      user
    });
    
    this.logDebug(`Auth state updated: isAuthenticated=${isAuthenticated}`);
    
    // Ensure all channels have panels before broadcasting
    this.channelManager.getAllRoles().forEach(role => {
      this.ensureChannelHasPanel(role);
    });
    
    // Broadcast the updated state
    this.broadcastAuthStatus();
  }
  
  /**
   * Clear authentication state (for logout) and broadcast to all panels
   */
  public clearAuthState(): void {
    console.log('[EXT][MessageRouter] clearAuthState called');
    
    this.state.updateAuthState({
      isAuthenticated: false,
      user: undefined
    });
    
    this.logDebug('Auth state cleared');
    
    // Broadcast the updated state
    this.broadcastAuthStatus();
  }
  
  /**
   * Log a debug message if dev logging is enabled
   */
  private logDebug(text: string): void {
    if (this.devLogging) {
      const message = `[EXT][MessageRouter] ${text}`;
      console.log(message);
      
      // Add to ring buffer
      this.logBuffer.push({
        timestamp: new Date(),
        message
      });
      
      // Keep only the last 100 messages
      if (this.logBuffer.length > 100) {
        this.logBuffer.shift();
      }
    }
  }
  
  /**
   * Enable or disable development logging
   */
  public setLogging(enabled: boolean): void {
    console.log('[EXT][MessageRouter] Logging set to:', enabled);
    this.devLogging = enabled;
    
    // Initialize the log buffer in the window for debugging
    if (enabled && typeof window !== 'undefined') {
      (window as any).__msgLog = this.logBuffer;
    }
    
    this.logDebug(`Development logging ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Dump debug information about all channels
   * This is useful for diagnostics
   */
  public dumpChannelState(): void {
    console.log('[EXT][MessageRouter] Dumping channel state...');
    this.channelManager.dumpChannelState();
  }
}
