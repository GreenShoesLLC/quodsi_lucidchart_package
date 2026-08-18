import { configureLogger, consoleSink, installDebugGlobal } from '@quodsi/lucid-shared';
import type { LogLevel } from '@quodsi/lucid-shared';

// Configure logging before anything else runs. Production ships at 'warn' so a
// customer's console stays clean; support can raise it at runtime with
// window.QUODSI_DEBUG.setLevel('debug'), which persists across reloads.
//
// __QUODSI_LOG_LEVEL__ is a build-time constant injected by webpack.config.js's
// DefinePlugin, not process.env.NODE_ENV: this project's tsconfig.json sets
// "types": [], so @types/node's `process` global is never in scope here, and
// adding it back would leak Node globals (Buffer, __dirname, ...) into a
// package that actually runs in a Lucid sandbox. See webpack.config.js and
// src/interop.d.ts for the injection and declaration.
//
// The namespaceLevels below are the former ExtensionDebugService.noisyComponents
// mute list, now config data instead of code. 'error' means "effectively muted".
configureLogger({
    level: __QUODSI_LOG_LEVEL__ as LogLevel,
    namespaceLevels: {
        MessageRouter: 'error',
        ChannelManager: 'error',
        RightDockPanel: 'error',
        ReferenceDataBuilder: 'error',
        ItemDataBuilder: 'error',
        ModelOpsHandler: 'error',
        StorageAdapter: 'error',
    },
    sinks: [consoleSink()],
});
installDebugGlobal();

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

// Initialize the analytics handler so host code can fire telemetry events
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
