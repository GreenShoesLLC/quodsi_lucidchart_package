// import { v4 as uuid } from 'uuid';
import {
  EnvelopeBase,
  EnvelopeMessageType,
  isEnvelope
} from '@quodsi/shared';
import { PanelRole, LogEntry } from './types';
import { ChannelManager } from './ChannelManager';
import { RoutablePanel } from './RoutablePanel';
import { MessageHandlers } from './handlers'; // Pre-load handlers at initialization time
import { ExtensionDebugService } from '../logging/ExtensionDebugService';

/**
 * MessageRouter singleton that handles all communication
 */
export class MessageRouter {
  private static instance: MessageRouter;

  private channelManager: ChannelManager;
  private devLogging = false;
  private logBuffer: LogEntry[] = [];
  private debug = ExtensionDebugService.forComponent('MessageRouter');

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
    this.debug.log(`registerChannel called for ${role}`);
    
    // Before registering, ensure we don't have a null panel
    if (!panel) {
      this.debug.error(`Cannot register null panel for ${role}`);
      return;
    }
    
    // Verify that the panel has the required relayToIframe method
    if (typeof panel.relayToIframe !== 'function') {
      this.debug.error(`Panel for ${role} doesn't have relayToIframe method`);
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
      this.debug.log(`Stored ${role} panel in global registry`);
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
        this.debug.log(`Retrieved ${role} panel from global registry`);
        return panel;
      }
    }
    
    this.debug.log(`No ${role} panel found in global registry`);
    return null;
  }
  
  /**
   * Ensure channel has a valid panel, trying to recover if needed
   */
  public ensureChannelHasPanel(role: PanelRole): boolean {
    // Get the current channel state
    const channel = this.channelManager.getChannel(role);
    if (!channel) {
      this.debug.error(`No channel found for ${role}`);
      return false;
    }
    
    // If the channel already has a valid panel, we're good
    if (channel.panel && typeof channel.panel.relayToIframe === 'function') {
      this.debug.log(`Channel ${role} already has a valid panel`);
      return true;
    }
    
    // Try to recover the panel from the global registry
    const panel = this.retrieveFromGlobalRegistry(role);
    if (panel) {
      this.registerChannel(role, panel);
      return true;
    }
    
    this.debug.error(`Could not recover panel for ${role}`);
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
    this.debug.log('Received message:', msg.type, msg);
    
    if (!isEnvelope(msg)) {
      this.logDebug(`Received invalid message format`);
      return;
    }

    this.logDebug(`Received message: ${msg.type} from ${msg.source}`);

    // Check for panel reference in the message - but only if we don't already have a valid panel
    if ((msg as any)._panelRef) {
      const role: PanelRole = 'model';

      // Only register if we don't already have a valid panel
      const channel = this.channelManager.getChannel(role);
      if (!channel || !channel.panel) {
        this.debug.log(`Found panel reference in message, registering for ${role}`);
        this.registerChannel(role, (msg as any)._panelRef);
      }
    }

    // Handle special REACT_APP_READY message
    if (msg.type === EnvelopeMessageType.REACT_APP_READY) {
      this.debug.log('Handling REACT_APP_READY message');
      this.handleReactAppReady(msg);
      return;
    }
    
    // For all other messages, use pre-loaded MessageHandlers
    // Rather than dynamic import which can cause timing issues
    try {
      this.debug.log('Forwarding message to MessageHandlers');
      if (MessageHandlers.handleMessage(msg)) {
        this.debug.log('Message was handled by a handler');
        this.logDebug(`Message ${msg.type} handled by MessageHandlers`);
      } else {
        this.debug.log('Message was NOT handled by any handler:', msg.type);
        this.logDebug(`Unhandled message type: ${msg.type}`);
      }
    } catch (err) {
      this.debug.error(`Error handling message:`, err);
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
    
    this.debug.log(`Marking channel ${role} as ready`);
    
    // If we have a panel reference in the message, register it
    if ((msg as any)._panelRef) {
      this.debug.log(`Registering panel from REACT_APP_READY message for ${role}`);
      this.registerChannel(role, (msg as any)._panelRef);
    }
    
    // Mark channel as ready
    this.channelManager.markChannelReady(role);

    // Ensure the channel has a panel before flushing
    this.debug.log(`Flushing queue for ${role}:`, {
      queueSize: this.channelManager.getChannel(role)?.queue.length,
      hasPanel: this.ensureChannelHasPanel(role),
      isReady: this.channelManager.isChannelReady(role)
    });
    
    // Flush queued messages
    this.channelManager.flushQueue(role);

    // Request the panel to send MODEL_CONTEXT
    this.debug.log(`About to request MODEL_CONTEXT for ${role}`);
    this.requestModelContext(role);
  }

  /**
   * Request the panel to send MODEL_CONTEXT
   */
  private requestModelContext(role: PanelRole): void {
    this.debug.log(`Requesting MODEL_CONTEXT from ${role} panel`);
    
    // Get the channel to access the panel
    const channel = this.channelManager.getChannel(role);
    if (!channel || !channel.panel) {
      this.debug.error(`Cannot request MODEL_CONTEXT - no panel found for ${role}`);
      return;
    }
    
    // Check if the panel has a method to send model context
    const panel = channel.panel as any;
    if (panel && typeof panel.sendModelContext === 'function') {
      this.debug.log(`Calling sendModelContext on ${role} panel`);
      panel.sendModelContext();
    } else if (panel && typeof panel.initializeModelContext === 'function') {
      this.debug.log(`Calling initializeModelContext on ${role} panel`);
      panel.initializeModelContext();
    } else {
      this.debug.warn(`Panel for ${role} does not have sendModelContext or initializeModelContext method`);
    }
  }

  /**
   * Log a debug message if dev logging is enabled
   */
  private logDebug(text: string): void {
    if (this.devLogging) {
      const message = `[EXT][MessageRouter] ${text}`;
      this.debug.debug(message);
      
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
    this.debug.log('Logging set to:', enabled);
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
    this.debug.log('Dumping channel state...');
    this.channelManager.dumpChannelState();
  }
}
