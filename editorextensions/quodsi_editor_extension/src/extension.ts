import {
    EditorClient,
    Viewport
} from 'lucid-extension-sdk';
import { ModelManager } from './core/ModelManager';
import { StorageAdapter } from './core/StorageAdapter';
import { RightDockPanel } from './panels/RightDockPanel';
import { initializeMessaging } from './core/messaging';
import { SelectionHandler } from './core/messaging/handlers/selection';
import { AnalyticsHandler } from './core/messaging/handlers/analyticsHandler';

const client = new EditorClient();
const viewport = new Viewport(client);
// Store client globally as a fallback for handlers
(globalThis as any).lucidEditorClient = client;

// Initialize storage adapter
const storageAdapter = new StorageAdapter();

// Initialize core model management with storage adapter using singleton pattern
ModelManager.initialize(client, storageAdapter);
const modelManager = ModelManager.getInstance();

console.info('[EXT][extension] Using new messaging system with RightDockPanel');

// Initialize messaging system with logging enabled
initializeMessaging(true);

// Initialize analytics handler so ANALYTICS_TRACK messages can be forwarded
AnalyticsHandler.initialize(client);

let rightDockPanel;
console.info('[EXT][extension] About to create RightDockPanel');
rightDockPanel = new RightDockPanel(client, modelManager);
rightDockPanel.setLogging(true);
console.info('[EXT][extension] Created RightDockPanel');

// Initialize the SelectionHandler with model manager
SelectionHandler.setModelManager(modelManager);

// Hook selection changes to SelectionHandler
viewport.hookSelection((items) => {
    SelectionHandler.handleLucidSelectionEvent(client, items);
});
console.info('[EXT][extension] Selection handler hooked');
console.info('[EXT][extension] Completed Successfully');
