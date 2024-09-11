import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
export declare const simulateAction: (action: DataConnectorAsynchronousAction) => Promise<{
    success: boolean;
}>;
