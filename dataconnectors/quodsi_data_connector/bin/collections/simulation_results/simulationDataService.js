"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationDataService = void 0;
const activityUtilizationSchema_1 = require("./activityUtilizationSchema");
const resourceUtilizationSchema_1 = require("./resourceUtilizationSchema");
const SIMULATION_SOURCE_NAME = "simulation_results";
const ACTIVITY_COLLECTION_NAME = "activity_utilization";
const RESOURCE_COLLECTION_NAME = "resource_utilization";
class SimulationDataService {
    constructor(dataProxy) {
        this.dataProxy = dataProxy;
    }
    getOrCreateActivityUtilizationCollection() {
        return this.getOrCreateCollection(ACTIVITY_COLLECTION_NAME, activityUtilizationSchema_1.ActivityUtilizationSchema);
    }
    getOrCreateResourceUtilizationCollection() {
        return this.getOrCreateCollection(RESOURCE_COLLECTION_NAME, resourceUtilizationSchema_1.ResourceUtilizationSchema);
    }
    getOrCreateCollection(collectionName, collectionSchema) {
        const dataSource = this.getOrCreateDataSource();
        const existingCollection = dataSource.collections.find((collection) => collection.getName() === collectionName);
        if (existingCollection) {
            return existingCollection;
        }
        return dataSource.addCollection(collectionName, collectionSchema);
    }
    getOrCreateDataSource() {
        const existingDataSource = this.dataProxy.dataSources.find((dataSource) => dataSource.getName() === SIMULATION_SOURCE_NAME);
        if (existingDataSource) {
            return existingDataSource;
        }
        return this.dataProxy.addDataSource(SIMULATION_SOURCE_NAME, { origin: 'simulation' });
    }
    async updateActivityUtilization(activityData) {
        const collection = this.getOrCreateActivityUtilizationCollection();
        return collection.patchItems({
            added: activityData,
        });
    }
    async updateResourceUtilization(resourceData) {
        const collection = this.getOrCreateResourceUtilizationCollection();
        return collection.patchItems({
            added: resourceData,
        });
    }
    // Add method to find items by ID
    async findActivityById(id) {
        const collection = this.getOrCreateActivityUtilizationCollection();
        return collection.items.get(id);
    }
    async findResourceById(id) {
        const collection = this.getOrCreateResourceUtilizationCollection();
        return collection.items.get(id);
    }
}
exports.SimulationDataService = SimulationDataService;
