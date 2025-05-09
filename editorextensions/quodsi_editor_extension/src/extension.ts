import {
    EditorClient,
    Menu,
    MenuType,
    Viewport
} from 'lucid-extension-sdk';
import { ModelManager } from './core/ModelManager';
import { ModelPanel } from './_deprecated/ModelPanel';
import { StorageAdapter } from './core/StorageAdapter';
import { AuthPanel } from './_deprecated/AuthPanel';
// Import new panels
import { ContentDockPanel } from './panels/ContentDockPanel';
import { RightDockPanel } from './panels/RightDockPanel';
// Import MessageRouter and initialization function
import { router, initializeMessaging } from './core/messaging';
import { ExtensionMessaging } from '@quodsi/shared';
import { SelectionManager } from './managers';
import { SelectionHandler } from './core/messaging/handlers/selection';
import { panelManager } from './managers/PanelManager';

// Toggle to use new messaging implementation


const client = new EditorClient();
const viewport = new Viewport(client);

// Initialize storage adapter
const storageAdapter = new StorageAdapter();

// Initialize core model management with storage adapter
const modelManager = new ModelManager(storageAdapter);

// Enable router logging if in new messaging mode
const useNewMessaging = true; // Set to true to use the new panels with MessageRouter
if (useNewMessaging) {
    console.info('[EXT][extension] Using new messaging system with ContentDockPanel and RightDockPanel');

    // Initialize messaging system with logging enabled
    initializeMessaging(true);

    let rightDockPanel, contentDoctPanel;
    console.info('[EXT][extension] About to create ContentDockPanel');
    contentDoctPanel = new ContentDockPanel(client);
    contentDoctPanel.setLogging(true);
    console.info('[EXT][extension] Created ContentDockPanel');

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
} else {
    let authPanel, modelPanel;
    console.info('[extension] About to create AuthPanel');
    authPanel = new AuthPanel(client);
    authPanel.setLogging(true);
    console.info('[extension] Created AuthPanel');

    console.info('[extension] About to create ModelPanel');
    modelPanel = new ModelPanel(client, modelManager);
    modelPanel.setLogging(true);
    console.info('[extension] Created ModelPanel');

    panelManager.registerAuthPanel(authPanel);
    panelManager.registerModelPanel(modelPanel);
    // Hook selection changes - note that both panel types implement handleSelectionChange
    viewport.hookSelection((items) => {
        modelPanel.handleSelectionChange(items);
    });
}

console.info('[EXT][extension] Completed Successfully');
