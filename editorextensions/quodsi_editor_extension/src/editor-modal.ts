import {
    EditorClient,
    Modal, Viewport, ItemProxy
} from 'lucid-extension-sdk';

export class EditorModal extends Modal {
    private q_objecttype: string | undefined;
    private reactAppReady: boolean = false;
    private firstSelectedItem: ItemProxy | null = null;  // Add this line to store the first selected item

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
            this.firstSelectedItem = selection[0];  // Store the first selected item
            const q_objecttypeValue = this.firstSelectedItem.shapeData.get('q_objecttype');
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
            try {
                if (this.firstSelectedItem && this.firstSelectedItem.shapeData) {
                    const serializedData = JSON.stringify(savedActivity);
                    this.firstSelectedItem.shapeData.set('q_data', serializedData);
                } else {
                    console.error('First selected item or its shape data is not available.');
                }
            } catch (error) {
                console.error('Error setting q_data:', error);
            } finally {
                this.hide();
            }
        }
    }

    private generateMessage(messageNumber: number): any {
        let message;

        switch (messageNumber) {
            case 1:
                message = {
                    messagetype: 'lucidchartdata',
                    simtype: this.q_objecttype,
                    version: '1',
                    instancedata: JSON.stringify({
                        id: 'activity1',
                        name: 'Basic Activity',
                        capacity: 1,
                        inputBufferCapacity: "Infinity",
                        outputBufferCapacity: "Infinity",
                        operationSteps: []
                    })
                };
                break;
            case 2:
                message = {
                    messagetype: 'lucidchartdata',
                    simtype: this.q_objecttype,
                    version: '1',
                    instancedata: JSON.stringify({
                        id: 'activity2',
                        name: 'Custom Activity',
                        capacity: 5,
                        inputBufferCapacity: 10,
                        outputBufferCapacity: 20,
                        operationSteps: [
                            {
                                resourceSetRequest: null,
                                duration: {
                                    durationLength: 15,
                                    durationPeriodUnit: "MINUTES",
                                    durationType: "CONSTANT",
                                    distribution: null
                                }
                            }
                        ]
                    })
                };
                break;
            case 3:
                message = {
                    messagetype: 'lucidchartdata',
                    simtype: this.q_objecttype,
                    version: '1',
                    instancedata: JSON.stringify({
                        id: 'activity3',
                        name: 'Complex Activity',
                        capacity: 10,
                        inputBufferCapacity: 15,
                        outputBufferCapacity: 25,
                        operationSteps: [
                            {
                                resourceSetRequest: null,
                                duration: {
                                    durationLength: 30,
                                    durationPeriodUnit: "MINUTES",
                                    durationType: "DISTRIBUTION",
                                    distribution: {
                                        distributionType: "NORMAL",
                                        parameters: {
                                            mean: 20,
                                            std: 5
                                        },
                                        description: "Normal distribution for operation step"
                                    }
                                }
                            },
                            {
                                resourceSetRequest: null,
                                duration: {
                                    durationLength: 45,
                                    durationPeriodUnit: "MINUTES",
                                    durationType: "CONSTANT",
                                    distribution: null
                                }
                            }
                        ]
                    })
                };
                break;
            default:
                throw new Error("Invalid message number");
        }

        return message;
    }
    private sendInitialMessage(): void {
        if (this.reactAppReady) {
            let serializedData = '';//this.generateMessage(2);
            if (this.firstSelectedItem && this.firstSelectedItem.shapeData) {
                serializedData = this.firstSelectedItem.shapeData.getString('q_data');
                // serializedData = JSON.stringify(q_dataValue);
                // serializedData = (q_dataValue);
            }
            const message = {
                messagetype: 'lucidchartdata',
                simtype: this.q_objecttype,
                version: '1',
                instancedata: serializedData
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
