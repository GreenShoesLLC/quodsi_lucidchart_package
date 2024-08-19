import {
    EditorClient,
    Panel, PanelLocation, DocumentProxy,
    Viewport,
    PageProxy
} from 'lucid-extension-sdk';
import { LucidChartMessageClass } from './LucidChartMessage';
import { LucidChartUtils } from './lucidChartUtils';
import { ConvertPageToModel } from './ConvertPageToModel';
import { RemoveModelFromPage } from './RemoveModelFromPage';

export class RightPanel extends Panel {
    private static icon = 'https://lucid.app/favicon.ico';
    private reactAppReady: boolean = false;

    constructor(client: EditorClient) {
        // console.log("RightPanel constructor called");
        // by default, this is called when the extension is loaded and only once.
        super(client, {
            title: 'Quodsi Right Panel',
            url: 'quodsim-react/index.html',
            location: PanelLocation.RightDock,
            iconUrl: RightPanel.icon,
        });
        //url: 'quodsim-react/index.html' is not called until the user clicks the panel the first time
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
        if (message.messagetype === 'SimulateModel') {
            console.log("Extension: Simulate button pressed");
            const document = new DocumentProxy(this.client);
            const docId = document.id;
            console.log("Extension: docId=", docId);
            this.client.performDataAction({
                dataConnectorName: 'quodsi_data_connector',
                actionName: 'Simulate',
                actionData: { docId },
                asynchronous: true
            });
            
        } else if (message.messagetype === 'reactAppReady') {
            console.log("Extension received reactAppReady message:");
            this.reactAppReady = true;
            // when the panel button is first clicked by user, React app will send the reactAppReady
            // and it will be received here.  

            // Need to query the viewport for what is selected here and send the appropriate message.
            const viewport = new Viewport(this.client);
            const pageModel = LucidChartUtils.getOrCreatePageModel(viewport, false);
            if (pageModel) {
                console.log('Page Model:', pageModel);
                // Page is a model so lets determine what is selected and send

                this.sendMessageToReact("rightpanel");
            } else {
                console.log('Page is not a Model yet');
                //Page is not a model so QS right panel should offer chance to convert first
                this.sendMessageToReact("ConvertPageToModel");
            }
        } else if (message.messagetype === 'ConvertPageToModel') {
            console.log('Extension received ConvertPageToModel');
            const viewport = new Viewport(this.client);
            const activePage: PageProxy | undefined = viewport.getCurrentPage();
            if (activePage) {
                LucidChartUtils.setPageCustomData(activePage)
                const converter = new ConvertPageToModel();
                converter.convert(activePage)
                this.sendMessageToReact("ValidateModel");
            }


        } else if (message.messagetype === 'ValidateModel') {
            console.log('Extension received ValidateModel');

        } else if (message.messagetype === 'RemoveModel') {
            console.log('Extension received RemoveModel');
            const viewport = new Viewport(this.client);
            const activePage: PageProxy | undefined = viewport.getCurrentPage();


            if (activePage) {
                // LucidChartUtils.deletePageCustomData(activePage)
                const remover = new RemoveModelFromPage(activePage);
                remover.removeModel();
                this.sendMessageToReact("ConvertPageToModel");
            }
        } else if (message.messagetype === 'RemoveModel') {
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