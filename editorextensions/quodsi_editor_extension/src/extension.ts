import {
    EditorClient, Menu, Viewport, BlockProxy, PageProxy
} from 'lucid-extension-sdk';

import { v4 as uuidv4 } from 'uuid';

import { EditorModal } from './editor-modal';
import { RightPanel } from './right-panel';
import { ContentDockPanel } from './content-dock-panel';
import { HelloWorldModal } from './hello-world-modal';


const client = new EditorClient();
const menu = new Menu(client);
const viewport = new Viewport(client);


function generateSimpleUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getOrCreatePageModelId(): string | null {
    console.log('getOrCreatePageModelId start');
    // 1. Get the active page
    const activePage: PageProxy | undefined = viewport.getCurrentPage();

    // Check if there's an active page
    if (!activePage) {
        console.error('No active page found');
        return null;
    }

    // 2. Get 'q_data' from the active page or create it if it doesn't exist
    let q_data: any = activePage.shapeData.get('q_data');

    if (!q_data) {
        // const pageModelId = uuidv4(); // Generate a new UUID
        const pageModelId = generateSimpleUUID(); // Generate a new UUID-like string
        q_data = {
            id: pageModelId,
            name: "Model1",
            type: "Model"
        };

        console.log('setting q_data');
        // Add the q_data property to the page

        activePage.shapeData.set('q_data', JSON.stringify(q_data));
        console.log('successfully set q_data');
    } else {
        // If q_data exists but is a string, parse it
        if (typeof q_data === 'string') {
            try {
                q_data = JSON.parse(q_data);
            } catch (error) {
                console.error('Error parsing q_data:', error);
                return null;
            }
        }
    }

    // 3. Get the id value from q_data of the page
    console.log('getOrCreatePageModelId finish');
    return q_data.id || null;
}

client.registerAction('hello', () => {
    const pageModelId = getOrCreatePageModelId();
    if (pageModelId) {
        console.log('Page Model ID:', pageModelId);
    } else {
        console.error('Failed to get or create page model ID');
    }
    const modal = new HelloWorldModal(client);
    modal.show();
});

client.registerAction('quodsimShapeSelected', () => {
    const selection = viewport.getSelectedItems();
    return (
        selection.length > 0 &&
        selection.length < 2 &&
        selection.every((item) => {

            if (item instanceof BlockProxy) {
                const q_objecttype = item.shapeData.get('q_objecttype');
                return q_objecttype !== undefined && q_objecttype !== null;
            }
            return false;
        })
    );
});

client.registerAction('showEditor', () => {
    const modal = new EditorModal(client);
    modal.show();
});

client.registerAction('showLineEditor', async () => {
    const page = await viewport.getCurrentPage();
    if (page) {
        const line = page?.addLine({
            endpoint1: { x: 10, y: 10 },
            endpoint2: { x: 100, y: 100 },
        })
        line.addTextArea('Hello', { location: 0.5, side: 0 })
        const modal = new EditorModal(client, "Line Editor", line);
        modal.show();
    }

});
// client.registerAction('makeSelectionRed', () => {
//     for (const item of viewport.getSelectedItems()) {
//         item.properties.set('FillColor', '#ff0000ff');
//     }
// });
client.registerAction("twoShapeSelected", () => {
    const items = viewport.getSelectedItems();
    return items.length === 2;
});
menu.addContextMenuItem({
    label: 'Add Line',
    action: 'showLineEditor',
    visibleAction: 'twoShapeSelected',
});

menu.addContextMenuItem({
    label: 'Properties',
    action: 'showEditor',
    visibleAction: 'quodsimShapeSelected',
});

menu.addDropdownMenuItem({
    label: 'Say Hello5',
    action: 'hello',
});

const rightPanel = new RightPanel(client);
const contentDockPanel = new ContentDockPanel(client);