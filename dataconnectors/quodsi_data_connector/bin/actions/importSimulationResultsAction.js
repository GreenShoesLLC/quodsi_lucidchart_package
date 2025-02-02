"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importSimulationResultsAction = void 0;
const activityDataService_1 = require("../collections/simulation_results/activityDataService");
const importSimulationResultsAction = async (action) => {
    try {
        console.log("=== Import Simulation Results Action Started ===");
        // Get the data from action.data with required pageId
        const data = action.data;
        if (!data.pageId) {
            throw new Error('pageId is required for import action');
        }
        // First, update the Models collection
        await (0, activityDataService_1.updateModelData)(action, data.documentId, data.userId, data.pageId);
        // Then proceed with activity data update
        const result = await (0, activityDataService_1.updateActivityData)(action, data.documentId, data.userId, 'import');
        console.log("=== Import Simulation Results Action Completed Successfully ===");
        return result;
    }
    catch (error) {
        console.error("=== Error in Import Simulation Results Action ===");
        console.error("Error details:", error);
        if (error instanceof Error) {
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        return { success: false };
    }
};
exports.importSimulationResultsAction = importSimulationResultsAction;
