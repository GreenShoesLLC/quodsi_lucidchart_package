import {
    EditorClient,
    Modal, Viewport
} from 'lucid-extension-sdk';

export class EditorModal extends Modal {
    private q_objecttype: string | undefined;
    private reactAppReady: boolean = false;

    constructor(client: EditorClient) {
        super(client, {
            title: 'Hello world',
            width: 400,
            height: 300,
            url: 'quodsim-react/index.html',
        });

        const viewport = new Viewport(client);
        const selection = viewport.getSelectedItems();
        if (selection.length > 0) {
            const q_objecttypeValue = selection[0].shapeData.get('q_objecttype');
            if (typeof q_objecttypeValue === 'string' || q_objecttypeValue === undefined) {
                this.q_objecttype = q_objecttypeValue;
                console.log("Selected object type:", this.q_objecttype);
            } else {
                console.error("Invalid type for q_objecttype:", typeof q_objecttypeValue);
            }
        } else {
            console.error("No items selected");
        }
    }
    
    protected frameLoaded(): void {
        console.log("Frame loaded");
        // No need to send the message here directly
    }

    protected messageFromFrame(message: any): void {
        console.log('Message from iframe:', message);

        if (message.messagetype === 'reactAppReady') {
            console.log("React app is ready");
            this.reactAppReady = true;
            this.sendInitialMessage();
        } else if (message.messagetype === 'activitySaved') {
            const savedActivity = message.data;
            console.log('Activity saved:', savedActivity);
            // Handle the saved activity data here
            // this.page.setTitle(`Activity Saved: ${savedActivity.name}`);
            this.hide();
        }
    }

    private sendInitialMessage(): void {
        if (this.reactAppReady) {
            const message = {
                messagetype: 'lucidchartdata',
                simtype: this.q_objecttype,
                version: '1',
                instancedata: JSON.stringify({ id: '123', capacity: 3, name: 'blah' })
            };

            console.log("Sending message:", message);

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
}
