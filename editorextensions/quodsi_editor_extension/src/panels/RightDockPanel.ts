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
import { SelectionHandler, SimulationHandler } from '../core/messaging/handlers';
import { ExtensionDebugService } from '../core/logging/ExtensionDebugService';

// Quodsi "Q" icon - 24x24 orange Q with dark blue trending chart line + data point dots
// SVG: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="11" cy="10" r="7" fill="none" stroke="#F26522" stroke-width="2.5"/><polyline points="6,13 8,11 9,12 11,8 13,9 15,6" fill="none" stroke="#1E3A5F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="13" r="1" fill="#1E3A5F"/><circle cx="8" cy="11" r="1" fill="#1E3A5F"/><circle cx="9" cy="12" r="1" fill="#1E3A5F"/><circle cx="11" cy="8" r="1" fill="#1E3A5F"/><circle cx="13" cy="9" r="1" fill="#1E3A5F"/><circle cx="15" cy="6" r="1" fill="#1E3A5F"/><line x1="14" y1="14" x2="18" y2="18" stroke="#F26522" stroke-width="2.5" stroke-linecap="round"/></svg>
// const QUODSI_ICON_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMSIgY3k9IjEwIiByPSI3IiBmaWxsPSJub25lIiBzdHJva2U9IiNGMjY1MjIiIHN0cm9rZS13aWR0aD0iMi41Ii8+PHBvbHlsaW5lIHBvaW50cz0iNiwxMyA4LDExIDksMTIgMTEsOCAxMyw5IDE1LDYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFFM0E1RiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjYiIGN5PSIxMyIgcj0iMSIgZmlsbD0iIzFFM0E1RiIvPjxjaXJjbGUgY3g9IjgiIGN5PSIxMSIgcj0iMSIgZmlsbD0iIzFFM0E1RiIvPjxjaXJjbGUgY3g9IjkiIGN5PSIxMiIgcj0iMSIgZmlsbD0iIzFFM0E1RiIvPjxjaXJjbGUgY3g9IjExIiBjeT0iOCIgcj0iMSIgZmlsbD0iIzFFM0E1RiIvPjxjaXJjbGUgY3g9IjEzIiBjeT0iOSIgcj0iMSIgZmlsbD0iIzFFM0E1RiIvPjxjaXJjbGUgY3g9IjE1IiBjeT0iNiIgcj0iMSIgZmlsbD0iIzFFM0E1RiIvPjxsaW5lIHgxPSIxNCIgeTE9IjE0IiB4Mj0iMTgiIHkyPSIxOCIgc3Ryb2tlPSIjRjI2NTIyIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+';

// Quodsi clock-Q icon - 24x24 orange rounded square with white clock face + Q tail
// SVG: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="4" fill="#F26522"/><circle cx="12" cy="12" r="8" fill="none" stroke="#FFFFFF" stroke-width="1.5"/><line x1="12" y1="5" x2="12" y2="6.5" stroke="#FFFFFF" stroke-width="1"/><line x1="19" y1="12" x2="17.5" y2="12" stroke="#FFFFFF" stroke-width="1"/><line x1="12" y1="19" x2="12" y2="17.5" stroke="#FFFFFF" stroke-width="1"/><line x1="5" y1="12" x2="6.5" y2="12" stroke="#FFFFFF" stroke-width="1"/><line x1="12" y1="12" x2="12" y2="8" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="12" x2="15" y2="9" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/><line x1="17" y1="17" x2="20" y2="20" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/></svg>
const QUODSI_CLOCK_ICON_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cmVjdCB4PSIxIiB5PSIxIiB3aWR0aD0iMjIiIGhlaWdodD0iMjIiIHJ4PSI0IiBmaWxsPSIjRjI2NTIyIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSIxMiIgeTE9IjUiIHgyPSIxMiIgeTI9IjYuNSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iMTkiIHkxPSIxMiIgeDI9IjE3LjUiIHkyPSIxMiIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iMTIiIHkxPSIxOSIgeDI9IjEyIiB5Mj0iMTcuNSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iNSIgeTE9IjEyIiB4Mj0iNi41IiB5Mj0iMTIiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjEyIiB5MT0iMTIiIHgyPSIxMiIgeTI9IjgiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxsaW5lIHgxPSIxMiIgeTE9IjEyIiB4Mj0iMTUiIHkyPSI5IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48bGluZSB4MT0iMTciIHkxPSIxNyIgeDI9IjIwIiB5Mj0iMjAiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==';

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
            // Simple orange circle SVG for testing base64 data URIs
            iconUrl: QUODSI_CLOCK_ICON_BASE64,
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
    }

    /**
     * Called when the iframe has been removed from the DOM
     */
    protected frameClosed(): void {
        this.debug.log('Frame closed, cleaning up resources');

        // Stop all polling for this document
        try {
            const documentProxy = new DocumentProxy(this.client);
            const documentId = documentProxy.id;
            if (documentId) {
                this.debug.log('Stopping simulation polling for document', documentId);
                SimulationHandler.stopAllPollingForDocument(documentId);
            }
        } catch (error) {
            this.debug.error('Error stopping simulation polling:', error);
        }

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
