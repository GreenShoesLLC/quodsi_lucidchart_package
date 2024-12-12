import {
    EditorClient,
    Viewport
} from 'lucid-extension-sdk';
import { ModelManager } from './core/ModelManager';
import { ModelPanel } from './panels/ModelPanel';
import { StorageAdapter } from './core/StorageAdapter';

const client = new EditorClient();
const viewport = new Viewport(client);

// Initialize storage adapter
const storageAdapter = new StorageAdapter();

// Initialize the messaging singleton
// const messaging = ExtensionMessaging.getInstance(); 
// Initialize core model management with storage adapter
const modelManager = new ModelManager(storageAdapter);

// Initialize panel with model manager instance
const modelPanel = new ModelPanel(client, modelManager);

// Hook selection changes
viewport.hookSelection((items) => {
    modelPanel.handleSelectionChange(items);
});