"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardRefreshAction = void 0;
const activityDataService_1 = require("../collections/simulation_results/activityDataService");
const contextHelper_1 = require("../utils/contextHelper");
const hardRefreshAction = async (action) => {
    try {
        console.log("=== Hard Refresh Action Started ===");
        // Get validated context data
        const context = (0, contextHelper_1.getRequiredContext)(action);
        // If no context found, return success without doing anything
        if (!context) {
            console.log("No valid context found, skipping poll update");
            return { success: true };
        }
        // Use the shared activity data service
        const result = await (0, activityDataService_1.updateActivityData)(action, context.documentId, context.userId, 'hardRefresh');
        console.log("=== Hard Refresh Action Completed Successfully ===");
        return result;
    }
    catch (error) {
        console.error("=== Error in Hard Refresh Action ===");
        console.error("Error details:", error);
        if (error instanceof Error) {
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        return { success: false };
    }
};
exports.hardRefreshAction = hardRefreshAction;
