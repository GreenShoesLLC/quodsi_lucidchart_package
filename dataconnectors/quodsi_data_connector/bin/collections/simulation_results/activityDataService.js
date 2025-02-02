"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchActivityData = fetchActivityData;
exports.prepareActivityCollectionUpdate = prepareActivityCollectionUpdate;
exports.sendCollectionUpdates = sendCollectionUpdates;
exports.updateActivityData = updateActivityData;
exports.updateModelData = updateModelData;
const activityUtilizationSchema_1 = require("./activityUtilizationSchema");
const resourceUtilizationSchema_1 = require("./resourceUtilizationSchema");
const shared_1 = require("@quodsi/shared");
const config_1 = require("../../config");
const papaparse_1 = require("papaparse");
const modelSchema_1 = require("./modelSchema");
// 1. Fetch and parse data
async function fetchActivityData(documentId, userId) {
    try {
        console.log("Fetching activity utilization data...");
        const config = (0, config_1.getConfig)();
        const lucidApiService = (0, shared_1.createLucidApiService)(config.apiBaseUrl);
        const csvText = await lucidApiService.getActivityUtilization(documentId, userId);
        // Parse CSV
        const parsedData = await new Promise((resolve) => {
            (0, papaparse_1.parse)(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results)
            });
        });
        // Convert to ActivityUtilizationData instances
        return parsedData.data.map(row => ({
            Id: row.Id,
            Name: row.Name,
            utilization_mean: row.utilization_mean,
            utilization_max: row.utilization_max,
            utilization_std_dev: row.utilization_std_dev,
            capacity_mean: row.capacity_mean,
            capacity_max: row.capacity_max,
            capacity_std_dev: row.capacity_std_dev,
            contents_mean: row.contents_mean,
            contents_max: row.contents_max,
            contents_std_dev: row.contents_std_dev,
            queue_length_mean: row.queue_length_mean,
            queue_length_max: row.queue_length_max,
            queue_length_std_dev: row.queue_length_std_dev
        }));
    }
    catch (error) {
        console.error("Error fetching activity data:", error);
        throw error;
    }
}
// 2. Prepare collection updates
function prepareActivityCollectionUpdate(activities) {
    const activityItems = new Map();
    activities.forEach(activity => {
        const quotedId = `"${activity.Id}"`;
        console.log(`Processing Activity ID: ${quotedId}`);
        // Convert to serialized fields
        const serialized = {};
        Object.entries(activity).forEach(([key, value]) => {
            serialized[key] = value;
        });
        activityItems.set(quotedId, serialized);
    });
    return {
        schema: activityUtilizationSchema_1.ActivityUtilizationSchema,
        patch: {
            items: activityItems
        }
    };
}
// 3. Send updates to Lucid
async function sendCollectionUpdates(action, updates, dataSourceName = "simulation_results") {
    try {
        console.log("=== Sending Updates to Lucid ===");
        await action.client.update({
            dataSourceName,
            collections: updates
        });
        console.log("=== Updates Sent Successfully ===");
        return { success: true };
    }
    catch (error) {
        console.error("Error sending updates to Lucid:", error);
        throw error;
    }
}
// Optional: Helper function that combines all steps
async function updateActivityData(action, documentId, userId, source = 'unknown') {
    try {
        console.log(`=== Starting Activity Data Update (Source: ${source}) ===`);
        // 1. Fetch and parse data
        const activities = await fetchActivityData(documentId, userId);
        // 2. Prepare collection updates
        const activityUpdate = prepareActivityCollectionUpdate(activities);
        // TODO: Add resource updates when available
        const updates = {
            "activity_utilization": activityUpdate,
            "resource_utilization": {
                schema: resourceUtilizationSchema_1.ResourceUtilizationSchema,
                patch: {
                    items: new Map()
                }
            }
        };
        // 3. Send updates to Lucid
        return await sendCollectionUpdates(action, updates);
    }
    catch (error) {
        console.error(`=== Error in Activity Data Update (Source: ${source}) ===`, error);
        throw error;
    }
}
// collections/simulation_results/activityDataService.ts
// Add to existing file
async function updateModelData(action, documentId, userId, pageId) {
    if (!pageId) {
        throw new Error('pageId is required for model data');
    }
    const modelData = {
        documentId,
        userId,
        pageId
    };
    await action.client.update({
        dataSourceName: "simulation_results",
        collections: {
            "Models": {
                schema: modelSchema_1.ModelSchema,
                patch: {
                    items: new Map([
                        [`"${pageId}"`, modelData] // Ensure the key is properly quoted
                    ])
                }
            }
        }
    });
}
