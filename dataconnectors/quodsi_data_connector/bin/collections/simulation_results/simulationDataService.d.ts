import { DataProxy, CollectionProxy } from "lucid-extension-sdk";
export declare class SimulationDataService {
    private dataProxy;
    constructor(dataProxy: DataProxy);
    getOrCreateActivityUtilizationCollection(): CollectionProxy;
    getOrCreateResourceUtilizationCollection(): CollectionProxy;
    private getOrCreateCollection;
    private getOrCreateDataSource;
    updateActivityUtilization(activityData: any[]): Promise<import("lucid-extension-sdk").PatchDataItemsResult>;
    updateResourceUtilization(resourceData: any[]): Promise<import("lucid-extension-sdk").PatchDataItemsResult>;
    findActivityById(id: string): Promise<import("lucid-extension-sdk").DataItemProxy>;
    findResourceById(id: string): Promise<import("lucid-extension-sdk").DataItemProxy>;
}
