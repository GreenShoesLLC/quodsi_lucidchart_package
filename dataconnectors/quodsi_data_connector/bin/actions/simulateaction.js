"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateAction = void 0;
const shared_1 = require("@quodsi/shared");
const config_1 = require("../config");
const simulateAction = async (action) => {
    try {
        // Type assertion to ensure action.data has the expected structure
        const data = action.data;
        // Extract data from action
        const { documentId, pageId, userId } = data;
        const authToken = action.context.userCredential;
        // Log the document ID for debugging purposes
        console.log(`[simulateAction] Simulate action triggered for document ID: ${documentId} with package ID: ${action.context.packageId}`);
        // Get configuration
        const config = (0, config_1.getConfig)();
        // Create LucidApiService instance
        const baseUrl = config.apiBaseUrl;
        const lucidApiService = (0, shared_1.createLucidApiService)(baseUrl);
        // Call the simulate endpoint using our service
        const success = await lucidApiService.simulateDocument(documentId, pageId, userId, authToken);
        console.log(success ? "[simulateAction] Simulate action successfully triggered." : "Simulate action failed.");
        return { success };
    }
    catch (error) {
        console.error("[simulateAction] Error executing simulate action:", error);
        return { success: false };
    }
};
exports.simulateAction = simulateAction;
