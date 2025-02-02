// services/simulationDataService.ts
import { DataProxy, CollectionProxy, SchemaDefinition } from "lucid-extension-sdk";
import { ActivityUtilizationSchema } from "./activityUtilizationSchema";
import { ResourceUtilizationSchema } from "./resourceUtilizationSchema";


const SIMULATION_SOURCE_NAME = "simulation_results";
const ACTIVITY_COLLECTION_NAME = "activity_utilization";
const RESOURCE_COLLECTION_NAME = "resource_utilization";

export class SimulationDataService {
    constructor(private dataProxy: DataProxy) { }

    getOrCreateActivityUtilizationCollection(): CollectionProxy {
        return this.getOrCreateCollection(ACTIVITY_COLLECTION_NAME, ActivityUtilizationSchema);
    }

    getOrCreateResourceUtilizationCollection(): CollectionProxy {
        return this.getOrCreateCollection(RESOURCE_COLLECTION_NAME, ResourceUtilizationSchema);
    }

    private getOrCreateCollection(
        collectionName: string,
        collectionSchema: SchemaDefinition,
    ): CollectionProxy {
        const dataSource = this.getOrCreateDataSource();
        const existingCollection = dataSource.collections.find(
            (collection) => collection.getName() === collectionName,
        );
        if (existingCollection) {
            return existingCollection;
        }
        return dataSource.addCollection(collectionName, collectionSchema);
    }

    private getOrCreateDataSource() {
        const existingDataSource = this.dataProxy.dataSources.find(
            (dataSource) => dataSource.getName() === SIMULATION_SOURCE_NAME,
        );
        if (existingDataSource) {
            return existingDataSource;
        }
        return this.dataProxy.addDataSource(SIMULATION_SOURCE_NAME, { origin: 'simulation' });
    }
    async updateActivityUtilization(activityData: any[]) {
        const collection = this.getOrCreateActivityUtilizationCollection();
        return collection.patchItems({
            added: activityData,
        });
    }

    async updateResourceUtilization(resourceData: any[]) {
        const collection = this.getOrCreateResourceUtilizationCollection();
        return collection.patchItems({
            added: resourceData,
        });
    }

    // Add method to find items by ID
    async findActivityById(id: string) {
        const collection = this.getOrCreateActivityUtilizationCollection();
        return collection.items.get(id);
    }

    async findResourceById(id: string) {
        const collection = this.getOrCreateResourceUtilizationCollection();
        return collection.items.get(id);
    }
}