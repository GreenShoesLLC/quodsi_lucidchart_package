// src/services/index.ts
// Re-export all service functionality to maintain a clean public API

// Config service
export { 
    DataCollectionConfig,
    getDataCollectionConfig,
    setDataCollectionConfig,
    resetDataCollectionConfig,
    isDataCollectionEnabled
} from './dataCollectionConfigService';

// Model operations
export {
    updateModelData
} from './modelDataService';

// Scenario operations
export {
    updateScenarioResultsData,
    getScenarioResultIds,
    parseScenarioResultId
} from './scenarioResultsService';

// Collection operations
export {
    CollectionUpdate,
    CollectionsUpdate,
    sendCollectionUpdates
} from './collectionUpdateService';

// Main simulation results operations
export {
    updateSimulationResults
} from './simulationResultsService';

// Simulation import operations
export {
    SimulationImportService,
    createSimulationImportService,
    SimulationImportParams,
    SimulationImportResult,
    CollectionImportConfig
} from './simulationImportService';

// Re-export existing services that might be used by others
export * from './simulationDataService';
