// actions/hardRefreshAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { updateActivityData } from "../collections/activityDataService";
import { getRequiredContext } from "../utils/contextHelper";

export const hardRefreshAction = async (action: DataConnectorAsynchronousAction) => {
    try {
        console.log("=== Hard Refresh Action Started ===");

        // Get validated context data
        const context = getRequiredContext(action);
        // If no context found, return success without doing anything
        if (!context) {
            console.log("No valid context found, skipping poll update");
            return { success: true };
        }

        // Use the shared activity data service
        const result = await updateActivityData(action, context.documentId, context.userId, 'hardRefresh');

        console.log("=== Hard Refresh Action Completed Successfully ===");
        return result;

    } catch (error) {
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