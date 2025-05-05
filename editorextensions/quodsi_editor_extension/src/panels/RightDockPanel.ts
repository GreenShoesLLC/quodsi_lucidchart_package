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
import { SelectionHandler } from '../core/messaging/handlers/selectionHandler';

/**
 * RightDockPanel is responsible for displaying the model editor UI.
 * It integrates with the new messaging router architecture and implements the RoutablePanel
 * interface to facilitate communication with the iframe content.
 */
export class RightDockPanel extends Panel implements RoutablePanel {
    private static readonly LOG_PREFIX = '[RightDockPanel]';
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
        this.modelManager = modelManager;
    }

    /**
     * Called when the panel is mounted by Lucid
     * Register with the router as a model panel
     */
    protected didMount(): void {
        this.log('didMount called');
        
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

        // Use a type assertion to bypass TypeScript's type checking
        // This is safe because we know EnvelopeBase is designed to be serializable
        this.sendMessage(msg as unknown as JsonSerializable);
    }
    /**
     * Process messages from the iframe
     * Route them through the router
     * 
     * @param message The message from the iframe
     */
    protected messageFromFrame(message: unknown): void {
        this.log('Received message from iframe');
        
        // Validate that it's a valid envelope
        if (!isEnvelope(message)) {
            this.logError('Invalid message format:', message);
            return;
        }
        
        // Set the source to the model iframe
        const envelope = message as EnvelopeBase;
        envelope.source = 'model-iframe';
        envelope.target = 'host';
        
        // Forward to the router
        router.receive(envelope);
    }

    /**
     * Called when the iframe has been constructed and loaded
     */
    protected frameLoaded(): void {
        this.log('Frame loaded');
        
        // Call parent method first to maintain proper behavior
        super.frameLoaded();
        
        // Additional initialization if needed
        this.isReady = true;
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
                SelectionHandler.setSelectionState(elementShapes, currentPage.allBlocks.size + currentPage.allLines.size);
            }
        } else {
            // No selection - set empty selection state
            SelectionHandler.setSelectionState([], 0);
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
