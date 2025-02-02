import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
export declare const pollAction: (action: DataConnectorAsynchronousAction) => Promise<{
    success: boolean;
}>;
