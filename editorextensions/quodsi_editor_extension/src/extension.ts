import {
    EditorClient,
    Panel, PanelLocation, Menu, Modal, Viewport, BlockProxy, DocumentProxy} from 'lucid-extension-sdk';


import { EditorModal } from './editor-modal';

export class RightPanel extends Panel {
    private static icon = 'https://lucid.app/favicon.ico';

    constructor(client: EditorClient) {
        super(client, {
            title: 'Quodsi Right Panel',
            url: 'quodsim-react/index.html',
            location: PanelLocation.RightDock,
            iconUrl: RightPanel.icon,
        });

        // Get the document information
        const document = new DocumentProxy(client);
        const docId = document.id;
        const docName = document.getTitle();

        // Send the document information to the React app
        this.sendMessage({
            type: 'documentInfo',
            id: docId,
            name: docName
        });
        this.sendMessage({
            messagetype: 'lucidchartdata',
            simtype: 'activity',
            version: '1',
            instancedata: JSON.stringify({ id: '123', capacity: 3, name: 'activity1' })
            });
    }
}

export class ContentDockPanel extends Panel {
    private static icon = 'https://lucid.app/favicon.ico';

    constructor(client: EditorClient) {
        super(client, {
            title: 'Quodsi Content Panel6',
            // url: 'http://localhost:3000',
            url: 'quodsim-react/index.html',
            location: PanelLocation.ContentDock,
            iconUrl: ContentDockPanel.icon,
        });

        console.log("Sending message from ContentDockPanel");
        this.sendMessage({
            messagetype: 'lucidchartdata',
            simtype: 'activity',
            version: '1',
            instancedata: JSON.stringify({ id: '123', capacity: 3, name: 'activity1' })
        });
    }

    protected messageFromFrame(message: any): void {
        console.log("Message from iframe:", message);
    }
}



class HelloWorldModal extends Modal {
    constructor(client: EditorClient) {
        super(client, {
            title: 'Hello world',
            width: 400,
            height: 300,
            content: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #333;">Lucid Styled Elements</h2>
                    <p>Here are some Lucid-styled buttons and an input field:</p>
                    <button class="lucid-styling primary" style="margin-right: 10px;">Primary</button>
                    <button class="lucid-styling secondary" style="margin-right: 10px;">Secondary</button>
                    <button class="lucid-styling tertiary">Tertiary</button>
                    <p>Input field:</p>
                    <input type="text" class="lucid-styling" placeholder="Enter text here">
                </div>
            `,
        });
    }
}
const client = new EditorClient();
const menu = new Menu(client);
const viewport = new Viewport(client);

client.registerAction('hello', () => {
    const modal = new HelloWorldModal(client);
    modal.show();
});



// client.registerAction('processBlocksSelected', () => {
//     const selection = viewport.getSelectedItems();
//     return (
//         selection.length > 0 &&
//         selection.every((item) => item instanceof BlockProxy && item.getClassName() === 'ProcessBlock')
//     );
// });

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

// client.registerAction('makeSelectionRed', () => {
//     for (const item of viewport.getSelectedItems()) {
//         item.properties.set('FillColor', '#ff0000ff');
//     }
// });

menu.addContextMenuItem({
    label: 'Edit',
    action: 'showEditor',
    visibleAction: 'quodsimShapeSelected',
});

menu.addDropdownMenuItem({
    label: 'Say Hello5',
    action: 'hello',
});
const rightPanel = new RightPanel(client);
const contentDockPanel = new ContentDockPanel(client);