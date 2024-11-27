export interface LucidChartMessage {
    [key: string]: any;  // index signature
    messagetype: string;
    simtype?: string;
    version: string;
    instancedata: string;
    documentId: string;
    lucidId: string;
}


export class LucidChartMessageClass implements LucidChartMessage {
    messagetype: string;
    simtype?: string;
    version: string;
    instancedata: string;
    documentId: string;
    lucidId: string;

    constructor(
        messagetype: string,
        instancedata: string,
        lucidId: string,
        documentId: string,
        simtype?: string,
        version: string = '1'
    ) {
        this.messagetype = messagetype;
        this.simtype = simtype;
        this.version = version;
        this.instancedata = instancedata;
        this.lucidId = lucidId
        this.documentId = documentId;
    }

    // Factory method for creating a message
    static createMessage(
        messagetype: string,
        instancedata: string,
        documentId: string,
        lucidId: string,
        simtype?: string,
        version: string = '1'): LucidChartMessageClass {
        return new LucidChartMessageClass(messagetype, instancedata, lucidId, documentId, simtype, version);
    }

    // Method to serialize the instance to a plain object
    toObject(): LucidChartMessage {
        return {
            messagetype: this.messagetype,
            lucidId: this.lucidId,
            simtype: this.simtype,
            version: this.version,
            instancedata: this.instancedata,
            documentId: this.documentId
        };
    }
}
