"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateAction = void 0;
const axios_1 = require("axios");
const simulateAction = async (action) => {
    try {
        // Type assertion to ensure action.data has the expected structure
        const data = action.data;
        // Extract document ID from action data
        const documentId = data.docId;
        // Log the document ID for debugging purposes
        console.log(`Simulate action triggered for document ID: ${documentId}`);
        // Define the API endpoint
        const apiUrl = `http://localhost:5000/api/Scenario/simulate/${documentId}`;
        // const apiUrl = `${action.context.callbackBaseUrl}/Scenario/simulate/${documentId}`;
        // Make the POST request to the QuodsiAPI's simulate endpoint using axios
        const response = await axios_1.default.post(apiUrl, null, {
            headers: {
                Authorization: `Bearer ${action.context.userCredential}` // Pass OAuth token
            }
        });
        // Check if the response was successful
        if (response.status === 200) {
            console.log("Simulate action successfully triggered.");
            return { success: true };
        }
        else {
            console.error("Simulate action failed.", response.statusText);
            return { success: false };
        }
    }
    catch (error) {
        console.error("Error executing simulate action:", error);
        return { success: false };
    }
};
exports.simulateAction = simulateAction;
