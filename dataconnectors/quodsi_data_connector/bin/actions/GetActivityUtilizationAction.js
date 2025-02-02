"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivityUtilizationAction = void 0;
const shared_1 = require("@quodsi/shared");
const config_1 = require("../config");
const getActivityUtilizationAction = async (action) => {
    try {
        // Type assertion to ensure action.data has the expected structure
        const data = action.data;
        // Extract data from action
        const { documentId, userId } = data;
        const authToken = action.context.userCredential;
        // Log for debugging
        console.log(`[getActivityUtilizationAction] Fetching activity utilization for document ID: ${documentId}`);
        // Get configuration
        const config = (0, config_1.getConfig)();
        // Create LucidApiService instance
        const baseUrl = config.apiBaseUrl;
        const lucidApiService = (0, shared_1.createLucidApiService)(baseUrl);
        // Get the CSV blob
        const csvText = await lucidApiService.getActivityUtilization(documentId, userId);
        console.log("[getActivityUtilizationAction] Successfully retrieved activity utilization data");
        return {
            status: 200,
            json: {
                csvData: csvText
            }
        };
    }
    catch (error) {
        console.error("[getActivityUtilizationAction] Error fetching activity utilization:", error);
        return {
            status: 500,
            json: {
                csvData: '',
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        };
    }
};
exports.getActivityUtilizationAction = getActivityUtilizationAction;
