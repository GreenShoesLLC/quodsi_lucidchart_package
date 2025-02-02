// actions/shared/activityDataService.ts
import { SerializedFields, DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { ActivityUtilizationSchema } from "./activityUtilizationSchema";
import { ResourceUtilizationSchema } from "./resourceUtilizationSchema";
import { ActivityUtilizationData } from "../../collections/simulation_results/types/simulationTypes";
import { createLucidApiService } from '@quodsi/shared';
import { getConfig } from '../../config';
import { parse } from 'papaparse';
import { ModelSchema } from "./modelSchema";

// Types
interface CollectionUpdate {
    schema: typeof ActivityUtilizationSchema | typeof ResourceUtilizationSchema;
    patch: {
        items: Map<string, SerializedFields>;
    };
}

interface CollectionsUpdate {
    [key: string]: CollectionUpdate;
}

// 1. Fetch and parse data
export async function fetchActivityData(documentId: string, userId: string): Promise<ActivityUtilizationData[]> {
    try {
        console.log("Fetching activity utilization data...");
        const config = getConfig();
        const lucidApiService = createLucidApiService(config.apiBaseUrl);

        const csvText = await lucidApiService.getActivityUtilization(documentId, userId);

        // Parse CSV
        const parsedData = await new Promise<import('papaparse').ParseResult<any>>((resolve) => {
            parse(csvText, {
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
    } catch (error) {
        console.error("Error fetching activity data:", error);
        throw error;
    }
}

// 2. Prepare collection updates
export function prepareActivityCollectionUpdate(activities: ActivityUtilizationData[]): CollectionUpdate {
    const activityItems = new Map<string, SerializedFields>();

    activities.forEach(activity => {
        const quotedId = `"${activity.Id}"`;
        console.log(`Processing Activity ID: ${quotedId}`);

        // Convert to serialized fields
        const serialized: SerializedFields = {};
        Object.entries(activity).forEach(([key, value]) => {
            serialized[key] = value;
        });

        activityItems.set(quotedId, serialized);
    });

    return {
        schema: ActivityUtilizationSchema,
        patch: {
            items: activityItems
        }
    };
}

// 3. Send updates to Lucid
export async function sendCollectionUpdates(
    action: DataConnectorAsynchronousAction,
    updates: CollectionsUpdate,
    dataSourceName: string = "simulation_results"
): Promise<{ success: boolean }> {
    try {
        console.log("=== Sending Updates to Lucid ===");
        await action.client.update({
            dataSourceName,
            collections: updates
        });
        console.log("=== Updates Sent Successfully ===");
        return { success: true };
    } catch (error) {
        console.error("Error sending updates to Lucid:", error);
        throw error;
    }
}

// Optional: Helper function that combines all steps
export async function updateActivityData(
    action: DataConnectorAsynchronousAction,
    documentId: string,
    userId: string,
    source: string = 'unknown'
) {
    try {
        console.log(`=== Starting Activity Data Update (Source: ${source}) ===`);

        // 1. Fetch and parse data
        const activities = await fetchActivityData(documentId, userId);

        // 2. Prepare collection updates
        const activityUpdate = prepareActivityCollectionUpdate(activities);

        // TODO: Add resource updates when available
        const updates: CollectionsUpdate = {
            "activity_utilization": activityUpdate,
            "resource_utilization": {
                schema: ResourceUtilizationSchema,
                patch: {
                    items: new Map<string, SerializedFields>()
                }
            }
        };

        // 3. Send updates to Lucid
        return await sendCollectionUpdates(action, updates);

    } catch (error) {
        console.error(`=== Error in Activity Data Update (Source: ${source}) ===`, error);
        throw error;
    }
}

// collections/simulation_results/activityDataService.ts
// Add to existing file

export async function updateModelData(
    action: DataConnectorAsynchronousAction,
    documentId: string,
    userId: string,
    pageId: string
): Promise<void> {
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
                schema: ModelSchema,
                patch: {
                    items: new Map([
                        [`"${pageId}"`, modelData]  // Ensure the key is properly quoted
                    ])
                }
            }
        }
    });
}