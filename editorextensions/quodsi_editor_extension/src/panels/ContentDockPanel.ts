import {
    PanelLocation,
    EditorClient,
    Panel,
    JsonSerializable
} from 'lucid-extension-sdk';
import {
    EnvelopeBase,
    EnvelopeMessageType,
    isEnvelope,
    QuodsiUserInfo
} from '@quodsi/shared';
import { router, RoutablePanel } from '../core/messaging';

/**
 * ContentDockPanel is responsible for handling user authentication in the left side panel.
 * It integrates with the new messaging router architecture and implements the RoutablePanel
 * interface to facilitate communication with the iframe content.
 */
export class ContentDockPanel extends Panel implements RoutablePanel {
    private static readonly LOG_PREFIX = '[ContentDockPanel]';
    private loggingEnabled: boolean = true;
    private isReady: boolean = false;
    private sendMessageCount: number = 0;
    private receiveMessageCount: number = 0;
    
    constructor(client: EditorClient) {
        super(client, {
            title: 'Quodsi',
            url: 'quodsim-react/index.html?panel=auth', // Query param helps the React app identify which panel it is
            location: PanelLocation.ContentDock,
            iconUrl: 'https://lucid.app/favicon.ico', // Temporary icon, should be replaced
            width: 300
        });
        
        this.log('ContentDockPanel Constructor called');
        console.log('### DIRECT DEBUG ### ContentDockPanel instance created', {
            prototype: Object.getOwnPropertyNames(Object.getPrototypeOf(this)),
            hasRelayToIframe: typeof this.relayToIframe === 'function'
        });
        
        // Store this panel in a global scope for recovery purposes
        this.registerGlobalReference();
        
        // Set up a periodic state check
        // setInterval(() => {
        //     console.log('### DIRECT DEBUG ### ContentDockPanel state check:', {
        //         isReady: this.isReady,
        //         loggingEnabled: this.loggingEnabled,
        //         sendMessageCount: this.sendMessageCount,
        //         receiveMessageCount: this.receiveMessageCount,
        //         panelVisible: this.isVisible?.() || 'unknown',
        //         frameExists: !!this.loaded
        //     });
        // }, 10000); // Check every 10 seconds
        
        // Run a one-time test to make sure this.sendMessage works
        // setTimeout(() => {
        //     this.testSendMessage();
        // }, 5000); // Run after 5 seconds
    }

    /**
     * Register this panel in a global scope for recovery purposes
     */
    private registerGlobalReference(): void {
        if (typeof window !== 'undefined') {
            // Create the global object if it doesn't exist
            if (!(window as any).quodsiExtension) {
                (window as any).quodsiExtension = { panels: {} };
            } else if (!(window as any).quodsiExtension.panels) {
                (window as any).quodsiExtension.panels = {};
            }
            
            // Store this panel
            (window as any).quodsiExtension.panels.auth = this;
            console.log('### DIRECT DEBUG ### Registered panel in global scope for recovery');
        }
    }

    /**
     * Test the sendMessage function directly
     */
    private testSendMessage(): void {
        try {
            console.log('### DIRECT DEBUG ### Testing ContentDockPanel.sendMessage directly');
            this.sendMessage({ type: 'TEST_MESSAGE', data: { timestamp: Date.now() } } as unknown as JsonSerializable);
            console.log('### DIRECT DEBUG ### Test message sent successfully!');
        } catch (err) {
            console.error('### DIRECT DEBUG ### Error in test message:', err);
        }
    }
    
    /**
     * Called when the panel is mounted by Lucid
     * Register with the router as an auth panel
     */
    protected didMount(): void {
        this.log('didMount called');
        console.log('### DIRECT DEBUG ### ContentDockPanel.didMount called');
        
        // Register with the router
        router.registerChannel('auth', this);
        
        this.log('Registered with message router');
    }

    /**
     * Implementation of RoutablePanel interface
     * Sends a message to the iframe
     * 
     * @param msg The envelope to deliver to the iframe
     */
    public relayToIframe(msg: EnvelopeBase): void {
        this.sendMessageCount++;
        this.log(`Relaying message to iframe: ${msg.type}`);
        console.log(`### DIRECT DEBUG ### ContentDockPanel.relayToIframe called (${this.sendMessageCount}):`, {
            msgType: msg.type,
            msgId: msg.id,
            msgTarget: msg.target,
            thisIsVisible: this.isVisible?.() || 'unknown',
            frameExists: !!this.loaded
        });

        try {
            // Use a type assertion to bypass TypeScript's type checking
            // This is safe because we know EnvelopeBase is designed to be serializable
            this.sendMessage(msg as unknown as JsonSerializable);
            console.log(`### DIRECT DEBUG ### ContentDockPanel.sendMessage completed for ${msg.type}`);
        } catch (err) {
            console.error(`### DIRECT DEBUG ### Error in ContentDockPanel.sendMessage:`, {
                error: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
                msgType: msg.type
            });
        }
    }

    /**
     * Process messages from the iframe
     * Route them through the router
     * 
     * @param message The message from the iframe
     */
    protected messageFromFrame(message: unknown): void {
        this.receiveMessageCount++;
        console.log(`### DIRECT DEBUG ### ContentDockPanel.messageFromFrame called (${this.receiveMessageCount}):`, message);
        this.log('Received message from iframe');
        
        // Validate that it's a valid envelope
        if (!isEnvelope(message)) {
            this.logError('Invalid message format:', message);
            return;
        }
        
        // Set the source to the auth iframe
        const envelope = message as EnvelopeBase;
        envelope.source = 'auth-iframe';
        envelope.target = 'host';
        
        // Add a hidden reference to this panel so the handlers can re-register it if needed
        // This won't be sent to the iframe as it's not part of the standard envelope structure
        (envelope as any)._panelRef = this;
        
        console.log('### DIRECT DEBUG ### ContentDockPanel forwarding message to router:', envelope.type);
        
        // Forward to the router
        router.receive(envelope);
    }

    /**
     * Called when the iframe has been constructed and loaded
     */
    protected frameLoaded(): void {
        this.log('Frame loaded');
        console.log('### DIRECT DEBUG ### ContentDockPanel.frameLoaded called');
        
        // Call parent method first to maintain proper behavior
        super.frameLoaded();
        
        // Additional initialization if needed
        this.isReady = true;
        
        // Re-register with the router to ensure we have a valid reference
        router.registerChannel('auth', this);
    }

    /**
     * Called when the iframe has been removed from the DOM
     */
    protected frameClosed(): void {
        this.log('Frame closed, cleaning up resources');
        console.log('### DIRECT DEBUG ### ContentDockPanel.frameClosed called');
        
        // Call parent method to maintain proper behavior
        super.frameClosed();
        
        // Mark iframe as not ready
        this.isReady = false;
    }
    
    /**
     * Check if panel is visible
     */
    public isVisible(): boolean {
        // If the panel has a frame property we can check
        return !!this.loaded;
    }

    /**
     * Enables or disables logging
     */
    public setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
        this.log(`Logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Log a message if logging is enabled
     */
    private log(message: string, ...args: any[]): void {
        if (this.loggingEnabled) {
            console.log(`${ContentDockPanel.LOG_PREFIX} ${message}`, ...args);
        }
    }

    /**
     * Log an error message always
     */
    private logError(message: string, ...args: any[]): void {
        console.error(`${ContentDockPanel.LOG_PREFIX} ${message}`, ...args);
    }
}
