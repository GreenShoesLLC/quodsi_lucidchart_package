import { v4 as uuid } from 'uuid';
import { EnvelopeBase } from '@quodsi/shared';
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
    console.log('### DIRECT DEBUG ### ChannelManager constructed');
  }
  
  /**
   * Register a panel with a channel
   */
  public registerChannel(role: PanelRole, panel: RoutablePanel): void {
    console.log(`### DIRECT DEBUG ### Registering ${role} panel:`, {
      panelExists: !!panel,
      panelType: panel ? panel.constructor.name : 'unknown',
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
    console.log(`### DIRECT DEBUG ### Marking channel ${role} as ready`);
    const ch = this.channels[role];
    ch.ready = true;
    
    // Add debug check for panel validity
    if (!ch.panel) {
      console.error(`### DIRECT DEBUG ### Channel ${role} marked ready but has no panel!`);
    } else {
      console.log(`### DIRECT DEBUG ### Channel ${role} has valid panel:`, {
        panelType: ch.panel.constructor.name,
        queueSize: ch.queue.length
      });
    }
  }
  
  /**
   * Check if a channel is ready
   */
  public isChannelReady(role: PanelRole): boolean {
    const isReady = this.channels[role]?.ready || false;
    console.log(`### DIRECT DEBUG ### Channel ${role} readiness check:`, isReady);
    return isReady;
  }
  
  /**
   * Get a channel by role
   */
  public getChannel(role: PanelRole): Channel | undefined {
    const channel = this.channels[role];
    console.log(`### DIRECT DEBUG ### Getting channel ${role}:`, {
      exists: !!channel,
      ready: channel?.ready,
      hasPanel: !!channel?.panel,
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
    console.log(`### DIRECT DEBUG ### ChannelManager enqueueOrSend for ${role}:`, {
      isReady: ch.ready,
      hasPanel: !!ch.panel,
      msgType: msg.type,
      msgId: msg.id
    });
    
    if (ch.ready && ch.panel) {
      try {
        console.log(`### DIRECT DEBUG ### Attempting to relay message to iframe:`, {
          role,
          msgType: msg.type,
          panelType: ch.panel.constructor.name
        });
        
        // Test if relayToIframe exists and is callable
        if (typeof ch.panel.relayToIframe !== 'function') {
          console.error(`### DIRECT DEBUG ### Panel doesn't have a relayToIframe method!`, {
            panelType: ch.panel.constructor.name,
            panelMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(ch.panel))
          });
        } else {
          ch.panel.relayToIframe(msg);
          console.log(`### DIRECT DEBUG ### Successfully relayed message to iframe:`, {
            role,
            msgType: msg.type
          });
        }
      } catch (err) {
        console.error(`### DIRECT DEBUG ### Error relaying message to iframe:`, {
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
    
    console.log(`### DIRECT DEBUG ### Flushing queue for ${role}:`, {
      queueSize: ch.queue.length,
      hasPanel: !!ch.panel,
      isReady: ch.ready,
      messageTypes: ch.queue.map(m => m.type)
    });
    
    this.logFn(`Flushing ${ch.queue.length} queued messages for ${role}`);
    
    if (!ch.panel) {
      console.error(`### DIRECT DEBUG ### Cannot flush queue: no panel for ${role}`);
      return;
    }
    
    if (!ch.ready) {
      console.warn(`### DIRECT DEBUG ### Flushing queue for channel that's not ready: ${role}`);
    }
    
    try {
      // Check if relayToIframe is a function
      if (typeof ch.panel.relayToIframe !== 'function') {
        console.error(`### DIRECT DEBUG ### Cannot flush queue: panel.relayToIframe is not a function`, {
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
          console.log(`### DIRECT DEBUG ### Flushing queued message ${index + 1}/${queueCopy.length}:`, {
            type: m.type,
            id: m.id
          });
          
          ch.panel!.relayToIframe(m);
          console.log(`### DIRECT DEBUG ### Successfully flushed message ${index + 1}`);
        } catch (err) {
          console.error(`### DIRECT DEBUG ### Error flushing message ${index + 1}:`, {
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            msgType: m.type
          });
          
          // Put the message back in the queue
          ch.queue.push(m);
        }
      });
      
      console.log(`### DIRECT DEBUG ### Queue flush complete. Remaining messages:`, ch.queue.length);
    } catch (err) {
      console.error(`### DIRECT DEBUG ### Unexpected error in flushQueue:`, {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // Keep the queue if an error occurred
      // We don't empty the queue here in case of errors
    }
  }
}
