import {
    EditorClient,
    Menu,
    MenuType,
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
console.info('[extension] About to create ModelPanel');
const modelPanel = new ModelPanel(client, modelManager);
modelPanel.setLogging(true);
console.info('[extension] Created ModelPanel2');

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