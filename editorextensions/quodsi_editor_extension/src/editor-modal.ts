import {
    EditorClient,
    Modal, Viewport
} from 'lucid-extension-sdk';

export class EditorModal extends Modal {
    constructor(client: EditorClient) {
        super(client, {
            title: 'Hello world',
            width: 400,
            height: 300,
            url: 'quodsim-react/index.html',
        });

        const viewport = new Viewport(client);
        const selection = viewport.getSelectedItems();
        const q_objecttype = selection[0].shapeData.get('q_objecttype');
        console.log("Selected object type:", q_objecttype);

        this.sendMessage({
            messagetype: 'lucidchartdata',
            simtype: q_objecttype,
            version: '1',
            instancedata: JSON.stringify({ id: '123', capacity: 3, name: 'blah' })
        }).then(() => {
            console.log("lucidchartdata Message sent successfully");
        }).catch((error) => {
            console.error("Failed to send lucidchartdata message:", error);
        });
    }

    protected messageFromFrame(message: any): void {
        console.log('Message from iframe:', message);

        if (message.messagetype === 'activitySaved') {
            const savedActivity = message.data;
            console.log('Activity saved:', savedActivity);
            // Handle the saved activity data here
            // this.page.setTitle(`Activity Saved: ${savedActivity.name}`);
            this.hide();
        }
    }
}
