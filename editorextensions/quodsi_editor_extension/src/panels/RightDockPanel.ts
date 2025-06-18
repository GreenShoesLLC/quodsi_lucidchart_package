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
import { ExtensionDebugService } from '../core/logging/ExtensionDebugService';


/**
 * RightDockPanel is responsible for displaying the model editor UI.
 * It integrates with the new messaging router architecture and implements the RoutablePanel
 * interface to facilitate communication with the iframe content.
 */
export class RightDockPanel extends Panel implements RoutablePanel {
    private debug = ExtensionDebugService.forComponent('RightDockPanel');
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
        
        this.debug.log('Constructor called with role: model');
        this.modelManager = modelManager;
    }

    /**
     * Called when the panel is mounted by Lucid
     * Register with the router as a model panel
     */
    protected didMount(): void {
        this.debug.log('didMount called - registering with router as "model" panel');
        
        // Register with the router
        router.registerChannel('model', this);
        
        this.debug.log('Registered with message router');
    }

    /**
     * Implementation of RoutablePanel interface
     * Sends a message to the iframe
     * 
     * @param msg The envelope to deliver to the iframe
     */
    public relayToIframe(msg: EnvelopeBase): void {
        this.debug.log(`relayToIframe called with msg type: ${msg.type}`);
        
        // Special logging for auth status
        if (msg.type === EnvelopeMessageType.AUTH_STATUS) {
            this.debug.log('Relaying AUTH_STATUS to iframe:', msg.data);
        }

        try {
            // Use a type assertion to bypass TypeScript's type checking
            // This is safe because we know EnvelopeBase is designed to be serializable
            this.sendMessage(msg as unknown as JsonSerializable);
            this.debug.debug(`sendMessage completed for ${msg.type}`);
        } catch (err) {
            this.debug.error(`Error in sendMessage:`, {
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
        this.debug.debug(`messageFromFrame called with type:`, 
            message && typeof message === 'object' && 'type' in message ? (message as any).type : 'unknown');
        
        // Validate that it's a valid envelope
        if (!isEnvelope(message)) {
            this.debug.error('Invalid message format:', message);
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
            this.debug.log('Received AUTH_STATUS message:', envelope.data);
        }
        
        this.debug.debug('Forwarding message to router:', envelope.type);
        
        // Forward to the router
        router.receive(envelope);
    }

    /**
     * Called when the iframe has been constructed and loaded
     */
    protected frameLoaded(): void {
        this.debug.log('frameLoaded called');

        // Call parent method first to maintain proper behavior
        super.frameLoaded();

        // Additional initialization if needed
        this.isReady = true;

        // Re-register with the router to ensure we have a valid reference
        this.debug.log('Re-registering with router as "model" panel');
        router.registerChannel('model', this);
        
        // IMPORTANT: Explicitly mark this channel as ready
        try {
            this.debug.log('Explicitly marking model channel as ready');
            const channelManager = router.getChannelManager();
            if (channelManager && typeof channelManager.markChannelReady === 'function') {
                channelManager.markChannelReady('model');
                this.debug.log('Successfully marked model channel as ready');
            }
        } catch (err) {
            this.debug.error('Error marking channel as ready:', err);
        }

        // Dump channel state to diagnose any issues
        this.debug.debug('Dumping channel state for diagnosis');
        if (typeof router.dumpChannelState === 'function') {
            router.dumpChannelState();
        }

        // NOTE: Previously we were waiting for REACT_APP_READY, but we should also
        // set up a delayed auth status request to handle cases where silent auth
        // completes after the panel initialization
        this.debug.log('Setting up delayed auth status request');

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
        this.debug.log('Requesting current auth state');
        try {
            // Get the current auth state from the router
            const authState = router.getAuthState();
            this.debug.log('Current auth state:', authState);

            // If we already have authentication, use it
            if (authState && authState.isAuthenticated) {
                // First try using the channel manager's force deliver method
                const channelManager = router.getChannelManager();
                if (channelManager && typeof channelManager.forceDeliverMessage === 'function') {
                    this.debug.log('Using forceDeliverMessage for AUTH_STATUS');
                    channelManager.forceDeliverMessage('model', EnvelopeMessageType.AUTH_STATUS, authState);
                    this.debug.log('Force delivered auth state:', authState);
                } else {
                    // Fallback to a direct broadcast request
                    this.debug.log('Using direct send for AUTH_STATUS');
                    router.send('model', {
                        id: `auth_status_request_${Date.now()}`,
                        type: EnvelopeMessageType.AUTH_STATUS,
                        source: 'host',
                        target: 'model-iframe',
                        version: '1.0',
                        data: authState
                    });

                    this.debug.log('Direct sent auth state:', authState);
                }
            } else {
                // No existing auth, broadcast to ensure we get latest state from auth panel
                this.debug.log('No auth state found, requesting broadcast');
                router.broadcastAuthStatus();
            }
        } catch (err) {
            this.debug.error('Error requesting auth state:', err);
        }
    }

    /**
     * Called when the iframe has been removed from the DOM
     */
    protected frameClosed(): void {
        this.debug.log('Frame closed, cleaning up resources');
        
        // Call parent method to maintain proper behavior
        super.frameClosed();
        
        // Mark iframe as not ready
        this.isReady = false;
    }

    /**
     * Shows the panel
     */
    public show(): void {
        this.debug.log('Show called');
        super.show();
        
        // Don't send MODEL_CONTEXT here - wait for REACT_APP_READY
        // The React app will send REACT_APP_READY when it's ready to receive messages
        // Then MessageRouter will call our sendModelContext() method
        this.debug.log('Panel shown, waiting for REACT_APP_READY to send MODEL_CONTEXT');
    }

    /**
     * Handle selection changes from the editor
     * 
     * @param items The selected items
     */
    public handleSelectionChange(items: ItemProxy[]): void {
        this.debug.debug(`Selection changed: ${items.length} items selected`);
        
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
     * Send MODEL_CONTEXT message to the React app
     * This is called by MessageRouter after AUTH and SUBSCRIPTION messages
     */
    public sendModelContext(): void {
        this.debug.log('sendModelContext called to establish document context');
        this.initializeModelContext();
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
                
                this.debug.log('Model context determined:', {
                    documentId: document.id,
                    pageId: currentPage.id,
                    title: document.getTitle() || 'Untitled Document',
                    isQuodsiModel: isQuodsiModel,
                    timestamp: new Date().toISOString()
                });
                
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
            this.debug.error('Error initializing model context:', error);
        }
    }

    /**
     * Enables or disables logging
     */
    public setLogging(enabled: boolean): void {
        // This method is kept for backward compatibility but now delegates to the debug service
        const debugService = ExtensionDebugService.getInstance();
        if (enabled) {
            debugService.enableComponent('RightDockPanel');
        } else {
            debugService.disableComponent('RightDockPanel');
        }
        this.debug.log(`Logging ${enabled ? 'enabled' : 'disabled'}`);
    }
}
