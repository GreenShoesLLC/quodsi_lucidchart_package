import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
import axios from 'axios';
export const simulateAction: (action: DataConnectorAsynchronousAction) => Promise<{ success: boolean }> = async (
    action,
) => {
    try {
        // Type assertion to ensure action.data has the expected structure
        const data = action.data as { docId: string };

        // Extract document ID from action data
        const documentId = data.docId;

        // Log the document ID for debugging purposes
        console.log(`Simulate action triggered for document ID: ${documentId}`);

        // Define the API endpoint
        const apiUrl = `http://localhost:5000/api/Lucid/simulate/${documentId}`;
        // const apiUrl = `${action.context.callbackBaseUrl}/Scenario/simulate/${documentId}`;


        // Make the POST request to the QuodsiAPI's simulate endpoint using axios
        const response = await axios.post(apiUrl, null, {
            headers: {
                Authorization: `Bearer ${action.context.userCredential}` // Pass OAuth token
            }
        });

        // Check if the response was successful
        if (response.status === 200) {
            console.log("Simulate action successfully triggered.");
            return { success: true };
        } else {
            console.error("Simulate action failed.", response.statusText);
            return { success: false };
        }
    } catch (error) {
        console.error("Error executing simulate action:", error);
        return { success: false };
    }
};

