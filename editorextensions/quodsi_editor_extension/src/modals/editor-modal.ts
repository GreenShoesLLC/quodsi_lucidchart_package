import {
    EditorClient,
    Modal, Viewport, ItemProxy,
    DocumentProxy
} from 'lucid-extension-sdk';
import { LucidChartMessageClass } from '../shared/types/LucidChartMessage';



export class EditorModal extends Modal {
    private q_objecttype: string | undefined;
    private reactAppReady: boolean = false;
    private firstSelectedItem: ItemProxy | null = null;  // Add this line to store the first selected item

    /**
     * Constructor for the EditorModal class.
     * @param client - The EditorClient instance.
     * @param title - Optional title for the modal.
     * @param firstItem - Optional first selected item to initialize.
     */
    constructor(client: EditorClient, title: string, firstItem: ItemProxy | null, q_objecttype: string | undefined) {
        super(client, {
            title: title,
            width: 400,
            height: 300,
            url: 'quodsim-react/index.html',
        });
        this.firstSelectedItem = firstItem;
        this.q_objecttype = q_objecttype
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
            this.sendMessageToReact();
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
    public sendMessageToReact(): void {
        if (this.reactAppReady) {
            let instancedata = '';
            let lucidId = '';
            if (this.firstSelectedItem && this.firstSelectedItem.shapeData) {
                instancedata = this.firstSelectedItem.shapeData.getString('q_data');
                lucidId = this.firstSelectedItem.id;
            }
            const document = new DocumentProxy(this.client);

            const message = LucidChartMessageClass.createMessage(
                'lucidchartdata',
                instancedata,
                document.id,
                lucidId,
                this.q_objecttype,
                "1"
            );

            console.log("Sending message:", message);

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
}
