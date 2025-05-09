import {
    PanelLocation,
    EditorClient,
    ItemProxy,
    Viewport,
    Panel,
    DocumentProxy,
    BlockProxy,
    LineProxy,
    JsonSerializable
} from 'lucid-extension-sdk';
import {
    EnvelopeBase,
    EnvelopeMessageType,
    isEnvelope
} from '@quodsi/shared';
import { ModelManager } from '../core/ModelManager';
import { router, RoutablePanel } from '../core/messaging';
import { SelectionHandler } from '../core/messaging/handlers';


/**
 * RightDockPanel is responsible for displaying the model editor UI.
 * It integrates with the new messaging router architecture and implements the RoutablePanel
 * interface to facilitate communication with the iframe content.
 */
export class RightDockPanel extends Panel implements RoutablePanel {
    private static readonly LOG_PREFIX = '[EXT][RightDockPanel]';
    private loggingEnabled: boolean = false;
    private isReady: boolean = false;
    private modelManager: ModelManager;

    constructor(client: EditorClient, modelManager: ModelManager) {
        super(client, {
            title: 'Quodsi Model',
            url: 'quodsim-react/index.html?panel=model', // Query param helps the React app identify which panel it is
            location: PanelLocation.RightDock,
            iconUrl: 'https://lucid.app/favicon.ico', // Temporary icon, should be replaced
            width: 300
        });
        
        this.log('RightDockPanel Constructor called');
        console.log('[EXT][RightDockPanel] Constructor called with role: model');
        this.modelManager = modelManager;
        
        // Enable logging for RightDockPanel by default for easier debugging
        this.loggingEnabled = true;
    }

    /**
     * Called when the panel is mounted by Lucid
     * Register with the router as a model panel
     */
    protected didMount(): void {
        this.log('didMount called');
        console.log('[EXT][RightDockPanel] didMount called - registering with router as "model" panel');
        
        // Register with the router
        router.registerChannel('model', this);
        
        this.log('Registered with message router');
    }

    /**
     * Implementation of RoutablePanel interface
     * Sends a message to the iframe
     * 
     * @param msg The envelope to deliver to the iframe
     */
    public relayToIframe(msg: EnvelopeBase): void {
        this.log(`Relaying message to iframe: ${msg.type}`);
        console.log(`[EXT][RightDockPanel] relayToIframe called with msg type: ${msg.type}`);
        
        // Special logging for auth status
        if (msg.type === EnvelopeMessageType.AUTH_STATUS) {
            console.log('[EXT][RightDockPanel] Relaying AUTH_STATUS to iframe:', msg.data);
        }

        try {
            // Use a type assertion to bypass TypeScript's type checking
            // This is safe because we know EnvelopeBase is designed to be serializable
            this.sendMessage(msg as unknown as JsonSerializable);
            console.log(`[EXT][RightDockPanel] sendMessage completed for ${msg.type}`);
        } catch (err) {
            console.error(`[EXT][RightDockPanel][ERROR] Error in sendMessage:`, {
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
        this.log('Received message from iframe');
        console.log(`[EXT][RightDockPanel] messageFromFrame called with type:`, 
            message && typeof message === 'object' && 'type' in message ? (message as any).type : 'unknown');
        
        // Validate that it's a valid envelope
        if (!isEnvelope(message)) {
            this.logError('Invalid message format:', message);
            return;
        }
        
        // Set the source to the model iframe
        const envelope = message as EnvelopeBase;
        envelope.source = 'model-iframe';
        envelope.target = 'host';
        
        // Add a hidden reference to this panel so the handlers can re-register it if needed
        (envelope as any)._panelRef = this;
        
        // Special handling for AUTH_STATUS messages - log them more verbosely
        if (envelope.type === EnvelopeMessageType.AUTH_STATUS) {
            console.log('[EXT][RightDockPanel] Received AUTH_STATUS message:', envelope.data);
        }
        
        console.log('[EXT][RightDockPanel] Forwarding message to router:', envelope.type);
        
        // Forward to the router
        router.receive(envelope);
    }

    /**
     * Called when the iframe has been constructed and loaded
     */
    protected frameLoaded(): void {
        this.log('Frame loaded');
        console.log('[EXT][RightDockPanel] frameLoaded called');

        // Call parent method first to maintain proper behavior
        super.frameLoaded();

        // Additional initialization if needed
        this.isReady = true;

        // Re-register with the router to ensure we have a valid reference
        console.log('[EXT][RightDockPanel] Re-registering with router as "model" panel');
        router.registerChannel('model', this);
        
        // IMPORTANT: Explicitly mark this channel as ready
        try {
            console.log('[EXT][RightDockPanel] Explicitly marking model channel as ready');
            const channelManager = router.getChannelManager();
            if (channelManager && typeof channelManager.markChannelReady === 'function') {
                channelManager.markChannelReady('model');
                console.log('[EXT][RightDockPanel] Successfully marked model channel as ready');
            }
        } catch (err) {
            console.error('[EXT][RightDockPanel][ERROR] Error marking channel as ready:', err);
        }

        // Dump channel state to diagnose any issues
        console.log('[EXT][RightDockPanel] Dumping channel state for diagnosis');
        if (typeof router.dumpChannelState === 'function') {
            router.dumpChannelState();
        }

        // NOTE: Previously we were waiting for REACT_APP_READY, but we should also
        // set up a delayed auth status request to handle cases where silent auth
        // completes after the panel initialization
        console.log('[EXT][RightDockPanel] Setting up delayed auth status request');

        // Request auth status after a short delay to allow silent auth to complete
        setTimeout(() => {
            this.requestAuthStatus();
        }, 3000); // 3 second delay
    }

    /**
     * Request current authentication status
     * This is a helper method to ensure we get the latest auth state
     */
    public requestAuthStatus(): void {
        console.log('[EXT][RightDockPanel] Requesting current auth state');
        try {
            // Get the current auth state from the router
            const authState = router.getAuthState();
            console.log('[EXT][RightDockPanel] Current auth state:', authState);

            // If we already have authentication, use it
            if (authState && authState.isAuthenticated) {
                // First try using the channel manager's force deliver method
                const channelManager = router.getChannelManager();
                if (channelManager && typeof channelManager.forceDeliverMessage === 'function') {
                    console.log('[EXT][RightDockPanel] Using forceDeliverMessage for AUTH_STATUS');
                    channelManager.forceDeliverMessage('model', EnvelopeMessageType.AUTH_STATUS, authState);
                    console.log('[EXT][RightDockPanel] Force delivered auth state:', authState);
                } else {
                    // Fallback to a direct broadcast request
                    console.log('[EXT][RightDockPanel] Using direct send for AUTH_STATUS');
                    router.send('model', {
                        id: `auth_status_request_${Date.now()}`,
                        type: EnvelopeMessageType.AUTH_STATUS,
                        source: 'host',
                        target: 'model-iframe',
                        version: '1.0',
                        data: authState
                    });

                    console.log('[EXT][RightDockPanel] Direct sent auth state:', authState);
                }
            } else {
                // No existing auth, broadcast to ensure we get latest state from auth panel
                console.log('[EXT][RightDockPanel] No auth state found, requesting broadcast');
                router.broadcastAuthStatus();
            }
        } catch (err) {
            console.error('[EXT][RightDockPanel][ERROR] Error requesting auth state:', err);
        }
    }

    /**
     * Called when the iframe has been removed from the DOM
     */
    protected frameClosed(): void {
        this.log('Frame closed, cleaning up resources');
        
        // Call parent method to maintain proper behavior
        super.frameClosed();
        
        // Mark iframe as not ready
        this.isReady = false;
    }

    /**
     * Shows the panel
     */
    public show(): void {
        this.log('Show called');
        super.show();
        
        // Capture initial selection and document context when panel is shown
        this.initializeModelContext();
        
        // When the panel is shown, we rely on the React app's REACT_APP_READY flow
        // to provide the current auth state, rather than explicitly requesting it
        console.log('[EXT][RightDockPanel] Panel shown, relying on REACT_APP_READY for auth state');
    }

    /**
     * Handle selection changes from the editor
     * 
     * @param items The selected items
     */
    public handleSelectionChange(items: ItemProxy[]): void {
        this.log(`Selection changed: ${items.length} items selected`);
        
        // Use the SelectionHandler to update the selection state
        if (items.length > 0) {
            // Get element shapes from the items
            const elementShapes = items.map(item => {
                // Check if the item is a line by checking if it's an instance of LineProxy
                const isLine = item instanceof LineProxy;
                // Get text from block - only blocks have text areas
                let text = '';
                if (item instanceof BlockProxy) {
                    // Get text from the first text area if any exist
                    const textAreaKeys = Array.from(item.textAreas.keys());
                    if (textAreaKeys.length > 0) {
                        text = item.textAreas.get(textAreaKeys[0]) || '';
                    }
                }
                
                return {
                    id: item.id,
                    type: isLine ? 'line' : 'block',
                    text,
                    // Additional properties can be added as needed
                };
            });
            
            // Get the document ID
            const documentId = new DocumentProxy(this.client).id;
            
            // Get the viewport to access the current page
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            
            if (currentPage) {
                // Set the selection state using the handler
                SelectionHandler.setSelectionState({
                    selectedElements: elementShapes,
                    selectionCount: elementShapes.length,
                    totalElementCount: currentPage.allBlocks.size + currentPage.allLines.size
                });
            }
        } else {
            // No selection - set empty selection state
            SelectionHandler.setSelectionState({
                selectedElements: [],
                selectionCount: 0,
                totalElementCount: 0
            });
        }
    }

    /**
     * Initialize the model context with document and page information
     */
    private initializeModelContext(): void {
        try {
            const document = new DocumentProxy(this.client);
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            
            if (document && currentPage) {
                // Determine if this is a Quodsi model
                const isQuodsiModel = this.modelManager.isQuodsiModel(currentPage);
                
                // Set the document context using the handler
                SelectionHandler.setDocumentContext(
                    document.id,
                    currentPage.id,
                    document.getTitle() || 'Untitled Document',
                    isQuodsiModel,
                    { /* Additional metadata if needed */ }
                );
                
                // Get the current selection and update it
                const selectedItems = viewport.getSelectedItems();
                this.handleSelectionChange(selectedItems);
            }
        } catch (error) {
            this.logError('Error initializing model context:', error);
        }
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
            console.log(`${RightDockPanel.LOG_PREFIX} ${message}`, ...args);
        }
    }

    /**
     * Log an error message always
     */
    private logError(message: string, ...args: any[]): void {
        console.error(`${RightDockPanel.LOG_PREFIX} ${message}`, ...args);
    }
}
