import {
    EditorClient,
    Panel, PanelLocation, DocumentProxy
} from 'lucid-extension-sdk';
import { LucidChartMessageClass } from './LucidChartMessage';

export class RightPanel extends Panel {
    private static icon = 'https://lucid.app/favicon.ico';
    private reactAppReady: boolean = false;

    constructor(client: EditorClient) {
        super(client, {
            title: 'Quodsi Right Panel',
            url: 'quodsim-react/index.html',
            location: PanelLocation.RightDock,
            iconUrl: RightPanel.icon,
        });

    }
    public sendMessageToReact(q_objecttype: string | undefined): void {
        if (this.reactAppReady) {

            let instancedata = '';
            let lucidId = '';
            const message = LucidChartMessageClass.createMessage(
                'lucidchartdata',
                instancedata,
                lucidId,
                q_objecttype,
                "1"
            );
            console.log("Extension sending message:", message);

            this.sendMessage(message.toObject())
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
            this.sendMessageToReact("rightpanel");
        } else if (message.messagetype === 'activitySaved') {
            const savedActivity = message.data;
            console.log('Activity saved:', savedActivity);
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