import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
export declare const getActivityUtilizationAction: (action: DataConnectorAsynchronousAction) => Promise<{
    status: number;
    json: {
        csvData: string;
    };
}>;
