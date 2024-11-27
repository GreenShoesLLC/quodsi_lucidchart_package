import {
    EditorClient,
    Menu,
    Viewport,
    DocumentProxy
} from 'lucid-extension-sdk';
import { ModelManager } from './core/ModelManager';
import { ModelPanel } from './panels/ModelPanel';

const client = new EditorClient();
const viewport = new Viewport(client);

// Initialize core model management
const modelManager = new ModelManager();

// Initialize panel with model manager instance
const modelPanel = new ModelPanel(client, modelManager);

// Hook selection changes
viewport.hookSelection((items) => {
    modelPanel.handleSelectionChange(items);
});