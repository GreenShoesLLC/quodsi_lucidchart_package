export interface LucidChartMessage {
    [key: string]: any;
    messagetype: string;
    simtype?: string;
    version: string;
    instancedata: string;
    lucidId: string;
}
export declare class LucidChartMessageClass implements LucidChartMessage {
    messagetype: string;
    simtype?: string;
    version: string;
    instancedata: string;
    lucidId: string;
    constructor(messagetype: string, instancedata: string, lucidId: string, simtype?: string, version?: string);
    static createMessage(messagetype: string, instancedata: string, lucidId: string, simtype?: string, version?: string): LucidChartMessageClass;
    toObject(): LucidChartMessage;
}
