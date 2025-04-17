import {
    EditorClient,
    Menu,
    MenuType,
    Viewport
} from 'lucid-extension-sdk';
import { ModelManager } from './core/ModelManager';
import { ModelPanel } from './panels/ModelPanel';
import { StorageAdapter } from './core/StorageAdapter';
import { AuthPanel } from './panels/AuthPanel';

const client = new EditorClient();
const viewport = new Viewport(client);

// Initialize storage adapter
const storageAdapter = new StorageAdapter();

// Initialize core model management with storage adapter
const modelManager = new ModelManager(storageAdapter);

// Initialize panels
console.info('[extension] About to create AuthPanel');
const authPanel = new AuthPanel(client);
authPanel.setLogging(true);
console.info('[extension] Created AuthPanel');

console.info('[extension] About to create ModelPanel');
const modelPanel = new ModelPanel(client, modelManager);
modelPanel.setLogging(true);
console.info('[extension] Created ModelPanel');

// Connect panels to allow communication
authPanel.setModelPanel(modelPanel);

// Initially show only AuthPanel, ModelPanel is hidden until authentication
authPanel.show();
modelPanel.hide();

// Hook selection changes
viewport.hookSelection((items) => {
    modelPanel.handleSelectionChange(items);
});

/*
    This code needs to be refactoring into the workflow
*/
const menu = new Menu(client);
client.registerAction("import", async () => {
    // Temporary workaround. You must call oauthXhr once before performDataAction will work
    const triggerOauth = await client.oauthXhr("lucid", {
        url: "https://api.lucid.co/folders/search",
        headers: {
            "Lucid-Api-Version": "1",
            "Content-Type": "application/json",
        },
        data: "{}",
        method: "POST",
    });
    const result = await client.performDataAction({
        dataConnectorName: "data-connector-1",
        actionName: "Import",
        actionData: { message: "ImportFolders" },
        asynchronous: true,
    });
    console.log(result);
});

menu.addMenuItem({
    label: "Import",
    action: "import",
    menuType: MenuType.Main,
});