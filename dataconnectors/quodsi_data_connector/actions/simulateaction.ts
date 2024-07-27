import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';

export const simulateAction: (action: DataConnectorAsynchronousAction) => Promise<{ success: boolean }> = async (
    action
) => {
    const documentId = action.data.documentId;
    // Your simulation logic here, using documentId as needed

    // Example response
    return { success: true };
};
