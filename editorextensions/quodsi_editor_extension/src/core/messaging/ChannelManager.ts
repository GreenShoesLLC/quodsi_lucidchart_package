import { v4 as uuid } from 'uuid';
import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { Channel, PanelRole } from './RouterTypes';
import { RoutablePanel } from './RoutablePanel';

/**
 * Manages communication channels with panels
 */
export class ChannelManager {
  /**
   * Channel registry for each panel type
   */
  private channels: Record<PanelRole, Channel> = {
    auth: { ready: false, queue: [] },
    model: { ready: false, queue: [] },
  };
  
  /**
   * Debug logger function
   */
  private logFn: (message: string) => void;
  
  constructor(logFn: (message: string) => void) {
    this.logFn = logFn;
    console.log('[EXT][ChannelManager] Constructed');
  }
  
  /**
   * Register a panel with a channel
   */
  public registerChannel(role: PanelRole, panel: RoutablePanel): void {
    console.log(`[EXT][ChannelManager] Registering ${role} panel:`, {
      panelExists: !!panel,
      panelType: panel ? panel.constructor.name : 'unknown',
      panelRole: role, // Add the role explicitly for clarity
      panelMethods: panel ? Object.getOwnPropertyNames(Object.getPrototypeOf(panel)) : []
    });
    
    this.logFn(`Registering ${role} panel`);
    const ch = this.channels[role];
    ch.panel = panel;
  }
  
  /**
   * Mark a channel as ready
   */
  public markChannelReady(role: PanelRole): void {
    console.log(`[EXT][ChannelManager] Marking channel ${role} as ready`);
    const ch = this.channels[role];
    ch.ready = true;
    
    // Add debug check for panel validity
    if (!ch.panel) {
      console.error(`[EXT][ChannelManager][ERROR] Channel ${role} marked ready but has no panel!`);
    } else {
      console.log(`[EXT][ChannelManager] Channel ${role} has valid panel:`, {
        panelType: ch.panel.constructor.name,
        panelRole: role, // Add the role explicitly
        queueSize: ch.queue.length
      });
    }
  }
  
  /**
   * Check if a channel is ready
   */
  public isChannelReady(role: PanelRole): boolean {
    const isReady = this.channels[role]?.ready || false;
    console.log(`[EXT][ChannelManager] Channel ${role} readiness check:`, isReady);
    return isReady;
  }
  
  /**
   * Get a channel by role
   */
  public getChannel(role: PanelRole): Channel | undefined {
    const channel = this.channels[role];
    console.log(`[EXT][ChannelManager] Getting channel ${role}:`, {
      exists: !!channel,
      ready: channel?.ready,
      hasPanel: !!channel?.panel,
      panelType: channel?.panel ? channel.panel.constructor.name : 'unknown',
      panelRole: role, // Add role for clarity
      queueSize: channel?.queue.length
    });
    return channel;
  }
  
  /**
   * Get all channel roles
   */
  public getAllRoles(): PanelRole[] {
    return Object.keys(this.channels) as PanelRole[];
  }
  
  /**
   * Enqueue a message or send it if the channel is ready
   */
  public enqueueOrSend(role: PanelRole, msg: EnvelopeBase): void {
    const ch = this.channels[role];
    console.log(`[EXT][ChannelManager] enqueueOrSend for ${role}:`, {
      isReady: ch.ready,
      hasPanel: !!ch.panel,
      msgType: msg.type,
      msgId: msg.id,
      msgTarget: msg.target
    });
    
    // Special handling for AUTH_STATUS messages - always log them
    if (msg.type === EnvelopeMessageType.AUTH_STATUS) {
      console.log(`[EXT][ChannelManager] AUTH_STATUS message for ${role}:`, {
        authData: msg.data,
        // isAuthenticated: msg.data?.isAuthenticated,
        hasTarget: !!msg.target
      });
    }
    
    if (ch.ready && ch.panel) {
      try {
        console.log(`[EXT][ChannelManager] Attempting to relay message to iframe:`, {
          role,
          msgType: msg.type,
          panelType: ch.panel.constructor.name,
          panelRole: role // Add role for clarity
        });
        
        // Test if relayToIframe exists and is callable
        if (typeof ch.panel.relayToIframe !== 'function') {
          console.error(`[EXT][ChannelManager][ERROR] Panel doesn't have a relayToIframe method!`, {
            panelType: ch.panel.constructor.name,
            panelMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(ch.panel))
          });
        } else {
          ch.panel.relayToIframe(msg);
          console.log(`[EXT][ChannelManager] Successfully relayed message to iframe:`, {
            role,
            msgType: msg.type
          });
        }
      } catch (err) {
        console.error(`[EXT][ChannelManager][ERROR] Error relaying message to iframe:`, {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          role,
          msgType: msg.type
        });
        
        // If relay fails, queue the message
        ch.queue.push(msg);
        this.logFn(`Relay failed, queued message for ${role}: ${msg.type}`);
      }
    } else {
      ch.queue.push(msg);
      this.logFn(`Queued message for ${role}: ${msg.type}`);
    }
  }
  
  /**
   * Flush all queued messages for a channel
   */
  public flushQueue(role: PanelRole): void {
    const ch = this.channels[role];
    
    console.log(`[EXT][ChannelManager] Flushing queue for ${role}:`, {
      queueSize: ch.queue.length,
      hasPanel: !!ch.panel,
      isReady: ch.ready,
      messageTypes: ch.queue.map(m => m.type)
    });
    
    this.logFn(`Flushing ${ch.queue.length} queued messages for ${role}`);
    
    if (!ch.panel) {
      console.error(`[EXT][ChannelManager][ERROR] Cannot flush queue: no panel for ${role}`);
      return;
    }
    
    if (!ch.ready) {
      console.warn(`[EXT][ChannelManager][WARN] Flushing queue for channel that's not ready: ${role}`);
    }
    
    try {
      // Check if relayToIframe is a function
      if (typeof ch.panel.relayToIframe !== 'function') {
        console.error(`[EXT][ChannelManager][ERROR] Cannot flush queue: panel.relayToIframe is not a function`, {
          panelType: ch.panel.constructor.name,
          panelMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(ch.panel))
        });
        return;
      }
      
      // Create a copy of the queue to safely iterate
      const queueCopy = [...ch.queue];
      
      // Clear the queue before processing to avoid infinite loops
      ch.queue.length = 0;
      
      // Process each message
      queueCopy.forEach((m, index) => {
        try {
          console.log(`[EXT][ChannelManager] Flushing queued message ${index + 1}/${queueCopy.length}:`, {
            type: m.type,
            id: m.id,
            target: m.target
          });
          
          // Special handling for AUTH_STATUS messages - always log them when flushing
          if (m.type === EnvelopeMessageType.AUTH_STATUS) {
            console.log(`[EXT][ChannelManager] Flushing AUTH_STATUS message:`, {
              authData: m.data,
              // isAuthenticated: m.data?.isAuthenticated,
              target: m.target
            });
          }
          
          ch.panel!.relayToIframe(m);
          console.log(`[EXT][ChannelManager] Successfully flushed message ${index + 1}`);
        } catch (err) {
          console.error(`[EXT][ChannelManager][ERROR] Error flushing message ${index + 1}:`, {
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            msgType: m.type
          });
          
          // Put the message back in the queue
          ch.queue.push(m);
        }
      });
      
      console.log(`[EXT][ChannelManager] Queue flush complete. Remaining messages: ${ch.queue.length}`);
      
      // If queue is empty, double-check panel readiness
      if (ch.queue.length === 0) {
        console.log(`[EXT][ChannelManager] Queue for ${role} is now empty. Panel ready: ${ch.ready}`);
      }
    } catch (err) {
      console.error(`[EXT][ChannelManager][ERROR] Unexpected error in flushQueue:`, {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // Keep the queue if an error occurred
      // We don't empty the queue here in case of errors
    }
  }

  /**
   * Force delivery of a specific message type to a channel
   * This is a diagnostic method to bypass normal queuing
   */
  public forceDeliverMessage(role: PanelRole, msgType: EnvelopeMessageType, data: any = {}): void {
    const ch = this.channels[role];
    
    console.log(`[EXT][ChannelManager] Force delivering ${msgType} to ${role}`, {
      hasPanel: !!ch.panel,
      isReady: ch.ready
    });
    
    if (!ch.panel) {
      console.error(`[EXT][ChannelManager][ERROR] Cannot force deliver: no panel for ${role}`);
      return;
    }
    
    if (typeof ch.panel.relayToIframe !== 'function') {
      console.error(`[EXT][ChannelManager][ERROR] Cannot force deliver: panel.relayToIframe is not a function`);
      return;
    }
    
    try {
      // Create a diagnostic message
      const msg: EnvelopeBase = {
        id: `force_${msgType}_${Date.now()}`,
        type: msgType,
        source: 'host',
        target: `${role}-iframe`,
        version: '1.0',
        data
      };
      
      // Force delivery regardless of queue state
      ch.panel.relayToIframe(msg);
      console.log(`[EXT][ChannelManager] Successfully force delivered ${msgType} to ${role}`);
    } catch (err) {
      console.error(`[EXT][ChannelManager][ERROR] Error force delivering message:`, {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        msgType
      });
    }
  }
  
  /**
   * Print channel state information for diagnostic purposes
   * This helps diagnose issues with channel registration
   */
  public dumpChannelState(): void {
    console.log('[EXT][ChannelManager] CHANNEL STATE DUMP:');
    
    Object.entries(this.channels).forEach(([role, channel]) => {
      console.log(`[EXT][ChannelManager] Channel '${role}' state:`, {
        role,
        ready: channel.ready,
        hasPanel: !!channel.panel,
        panelType: channel.panel ? channel.panel.constructor.name : 'none',
        queueLength: channel.queue.length,
        messageTypes: channel.queue.map(m => m.type)
      });
    });
  }
}
