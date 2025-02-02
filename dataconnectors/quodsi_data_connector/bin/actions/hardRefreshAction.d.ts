import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
export declare const hardRefreshAction: (action: DataConnectorAsynchronousAction) => Promise<{
    success: boolean;
}>;
