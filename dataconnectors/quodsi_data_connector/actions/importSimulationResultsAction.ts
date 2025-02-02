// actions/importSimulationResultsAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { updateActivityData, updateModelData } from "../collections/simulation_results/activityDataService";
import { getRequiredContext } from "../utils/contextHelper";

export const importSimulationResultsAction = async (action: DataConnectorAsynchronousAction) => {
    try {
        console.log("=== Import Simulation Results Action Started ===");

        // Get the data from action.data with required pageId
        const data = action.data as { documentId: string; userId: string; pageId: string };
        if (!data.pageId) {
            throw new Error('pageId is required for import action');
        }

        // First, update the Models collection
        await updateModelData(action, data.documentId, data.userId, data.pageId);

        // Then proceed with activity data update
        const result = await updateActivityData(action, data.documentId, data.userId, 'import');

        console.log("=== Import Simulation Results Action Completed Successfully ===");
        return result;

    } catch (error) {
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