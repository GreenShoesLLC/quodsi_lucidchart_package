import {
    EditorClient,
    Panel, PanelLocation
} from 'lucid-extension-sdk';


export class ContentDockPanel extends Panel {
    private static icon = 'https://lucid.app/favicon.ico';
    private reactAppReady: boolean = false;

    constructor(client: EditorClient, title?: string) {
        super(client, {
            title: title || 'Quodsim',
            // url: 'http://localhost:3000',
            url: 'quodsim-react/index.html',
            location: PanelLocation.ContentDock,
            iconUrl: ContentDockPanel.icon,
        });

    }
    private sendInitialMessage(): void {
        if (this.reactAppReady) {

            let serializedData = '';
            const message = {
                messagetype: 'lucidchartdata',
                simtype: 'contentdock',
                version: '1',
                instancedata: serializedData
            };

            console.log("Extension sending message:", message);

            this.sendMessage(message)
                .then(() => {
                    console.log("lucidchartdata Message sent successfully");
                })
                .catch((error) => {
                    console.error("Failed to send lucidchartdata message:", error);
                });
        } else {
            console.log("React app not ready yet, waiting...");
        }
    }
    protected messageFromFrame(message: any): void {
        console.log('Message from iframe:', message);
        if (message.messagetype === 'reactAppReady') {
            console.log("Extension received reactAppReady message:");
            this.reactAppReady = true;
            this.sendInitialMessage();
        } else if (message.messagetype === 'modelSaved') {
            const savedActivity = message.data;
            console.log('Model saved:', savedActivity);
            // try {
            //     if (this.firstSelectedItem && this.firstSelectedItem.shapeData) {
            //         const serializedData = JSON.stringify(savedActivity);
            //         this.firstSelectedItem.shapeData.set('q_data', serializedData);
            //     } else {
            //         console.error('First selected item or its shape data is not available.');
            //     }
            // } catch (error) {
            //     console.error('Error setting q_data:', error);
            // } finally {
            //     this.hide();
            // }
        }
    }
}