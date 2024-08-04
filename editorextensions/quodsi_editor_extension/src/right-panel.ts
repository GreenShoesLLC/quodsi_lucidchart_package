import {
    EditorClient,
    Panel, PanelLocation, DocumentProxy
} from 'lucid-extension-sdk';

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