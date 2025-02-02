import { SerializedFields, DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { ActivityUtilizationSchema } from "./activityUtilizationSchema";
import { ResourceUtilizationSchema } from "./resourceUtilizationSchema";
import { ActivityUtilizationData } from "../../collections/simulation_results/types/simulationTypes";
interface CollectionUpdate {
    schema: typeof ActivityUtilizationSchema | typeof ResourceUtilizationSchema;
    patch: {
        items: Map<string, SerializedFields>;
    };
}
interface CollectionsUpdate {
    [key: string]: CollectionUpdate;
}
export declare function fetchActivityData(documentId: string, userId: string): Promise<ActivityUtilizationData[]>;
export declare function prepareActivityCollectionUpdate(activities: ActivityUtilizationData[]): CollectionUpdate;
export declare function sendCollectionUpdates(action: DataConnectorAsynchronousAction, updates: CollectionsUpdate, dataSourceName?: string): Promise<{
    success: boolean;
}>;
export declare function updateActivityData(action: DataConnectorAsynchronousAction, documentId: string, userId: string, source?: string): Promise<{
    success: boolean;
}>;
export declare function updateModelData(action: DataConnectorAsynchronousAction, documentId: string, userId: string, pageId: string): Promise<void>;
export {};
