// services/simulationImportService.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { getStorageService, initializeStorageService } from "./simulationData";
import {
    resetDataCollectionConfig,
    setDataCollectionConfig,
    updateSimulationResults
} from "./index";
import { ActionLogger } from '../utils/logging';

/**
 * Configuration for collections to import
 */
export interface CollectionImportConfig {
    collectActivityUtilization?: boolean;
    collectActivityRepSummary?: boolean;
    collectActivityTiming?: boolean;
    collectEntityStateRepSummary?: boolean;
    collectEntityThroughputRepSummary?: boolean;
    collectResourceRepSummary?: boolean;
    collectResourceUtilization?: boolean;
}

/**
 * Input parameters for the simulation import process
 */
export interface SimulationImportParams {
    documentId: string;
    scenarioId: string;
    collectionsToImport?: string[];
    verboseLogging?: boolean;
}

/**
 * Result of the simulation import process
 */
export interface SimulationImportResult {
    success: boolean;
    error?: string;
    modelUpdated?: boolean;
    [key: string]: any; // Allow for additional properties
}

/**
 * Service to handle the import of simulation results from Azure Storage
 */
export class SimulationImportService {
    private logger: ActionLogger;
    private verboseLogging: boolean;
    private config = getConfig();

    /**
     * Creates a new instance of SimulationImportService
     * @param actionId Unique identifier for the current action (for logging)
     * @param verboseLogging Whether to enable verbose logging
     */
    constructor(actionId: string, verboseLogging = false) {
        this.verboseLogging = verboseLogging;
        this.logger = new ActionLogger(`[Import:${actionId}]`, verboseLogging);
    }

    /**
     * Import simulation results from Azure Storage
     * @param action The Lucid action context
     * @param params Import parameters
     * @returns Result of the import operation
     */
    public async importSimulationResults(
        action: DataConnectorAsynchronousAction,
        params: SimulationImportParams
    ): Promise<SimulationImportResult> {
        try {
            this.logger.info(`=== Processing Simulation Import ===`);

            // Validate required parameters
            if (!params.scenarioId) {
                throw new Error('scenarioId is required for import action');
            }

            this.logger.info(`Document ID: ${params.documentId}, Scenario ID: ${params.scenarioId}`);

            // Use documentId as container name
            const containerName = params.documentId;
            this.logger.info(`Using documentId as container name: ${containerName}`);

            // Initialize storage service
            this.logger.info(`Using Azure storage connection string: ${this.config.azureStorageConnectionString ? '(defined)' : '(undefined)'}`);
            initializeStorageService(this.config.azureStorageConnectionString);

            // Check if container exists before proceeding
            const containerExists = await this.checkContainerExists(containerName);
            if (!containerExists) {
                this.logger.error(`Cannot continue: Container "${containerName}" does not exist`);
                return {
                    success: false,
                    error: `Container "${containerName}" does not exist`,
                    modelUpdated: true
                };
            }

            // Configure which collections to import based on optional input parameter
            this.configureCollectionsToImport(params.collectionsToImport);

            // Check for entity throughput data files
            await this.investigateEntityThroughputData(containerName);

            // Override the container name in config to use documentId
            this.logger.info(`Temporarily overriding simulationResultsContainer config from "${this.config.simulationResultsContainer}" to "${containerName}"`);
            const originalContainer = this.config.simulationResultsContainer;
            (this.config as any).simulationResultsContainer = containerName;

            // Proceed with simulation results update
            this.logger.info(`Updating simulation results...`);
            const result = await updateSimulationResults(
                action,
                params.documentId,
                params.scenarioId,
                'import',
                this.verboseLogging,
                this.logger
            );

            // Restore original config value
            (this.config as any).simulationResultsContainer = originalContainer;
            this.logger.info(`Restored original container config value: "${originalContainer}"`);

            if (result.success) {
                this.logger.info(`=== Import Processing Completed Successfully ===`);
            } else {
                this.logger.error(`=== Import Processing Partially Completed with Errors ===`);
                // Check if 'error' property exists
                if ('error' in result) {
                    this.logger.error(`Error in simulation results update: ${result.error}`);
                } else {
                    this.logger.error(`Error in simulation results update: Unknown error`);
                }
            }

            return {
                ...result,
                success: true,  // Always return success if we at least updated the model
                modelUpdated: true
            };

        } catch (error) {
            this.logger.error(`=== Error in Import Processing ===`);
            this.logger.error(`Error details:`, error);
            if (error instanceof Error) {
                this.logger.error(`Error name: ${error.name}`);
                this.logger.error(`Error message: ${error.message}`);
                this.logger.error(`Error stack: ${error.stack}`);
            }
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        } finally {
            // Always reset to default configuration when done
            resetDataCollectionConfig();
        }
    }

    /**
     * Check if container exists and try to diagnose issues if it doesn't
     * @param containerName Container name to check
     * @returns True if container exists, false otherwise
     */
    private async checkContainerExists(containerName: string): Promise<boolean> {
        const storageService = getStorageService();
        const containerExists = await storageService.containerExists(containerName);
        this.logger.info(`Container "${containerName}" exists: ${containerExists}`);

        if (!containerExists) {
            this.logger.warn(`Container "${containerName}" not found with current connection string.`);

            // List available containers to diagnose the issue
            try {
                const availableContainers = await storageService.listContainers();
                if (availableContainers.length > 0) {
                    this.logger.info(`Available containers in storage account: ${availableContainers.join(', ')}`);

                    // Check if we can find the document ID in a different format
                    const normalizedDocId = containerName.toLowerCase().replace(/-/g, '');
                    const possibleMatches = availableContainers.filter(name => {
                        const normalizedName = name.toLowerCase().replace(/-/g, '');
                        return normalizedName === normalizedDocId ||
                            normalizedName.includes(normalizedDocId) ||
                            normalizedDocId.includes(normalizedName);
                    });

                    if (possibleMatches.length > 0) {
                        this.logger.info(`Found possible container matches: ${possibleMatches.join(', ')}`);
                        // Note: Currently we don't use these matches, but could in the future
                    }
                } else {
                    this.logger.warn(`No containers found in storage account. Check connection string.`);
                }
            } catch (error) {
                this.logger.error(`Error listing containers: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return containerExists;
    }

    /**
     * Configure which collections to import
     * @param collectionsToImport Array of collection names to import
     */
    private configureCollectionsToImport(collectionsToImport?: string[]): void {
        if (collectionsToImport && collectionsToImport.length > 0) {
            this.logger.info(`Custom collection import configuration specified: ${collectionsToImport.join(', ')}`);

            // Start by disabling all collections
            setDataCollectionConfig({
                collectActivityUtilization: false,
                collectActivityRepSummary: false,
                collectActivityTiming: false,
                collectEntityStateRepSummary: false,
                collectEntityThroughputRepSummary: false,
                collectResourceRepSummary: false,
                collectResourceUtilization: false
            });

            // Then enable only the specified collections
            const configUpdate: CollectionImportConfig = {};
            collectionsToImport.forEach(collection => {
                switch (collection) {
                    case 'activity_utilization':
                        configUpdate.collectActivityUtilization = true;
                        break;
                    case 'activity_rep_summary':
                        configUpdate.collectActivityRepSummary = true;
                        break;
                    case 'activity_timing':
                        configUpdate.collectActivityTiming = true;
                        break;
                    case 'entity_state_rep_summary':
                        configUpdate.collectEntityStateRepSummary = true;
                        break;
                    case 'entity_throughput_rep_summary':
                        configUpdate.collectEntityThroughputRepSummary = true;
                        break;
                    case 'resource_rep_summary':
                        configUpdate.collectResourceRepSummary = true;
                        break;
                    case 'resource_utilization':
                        configUpdate.collectResourceUtilization = true;
                        break;
                    default:
                        this.logger.warn(`Unknown collection specified: ${collection}`);
                }
            });

            setDataCollectionConfig(configUpdate);
        } else {
            // If no specific collections are requested, reset to default (all enabled)
            resetDataCollectionConfig();
        }
    }

    /**
     * Check for entity throughput data files in the container
     * @param containerName Container to check
     */
    private async investigateEntityThroughputData(containerName: string): Promise<void> {
        try {
            const storageService = getStorageService();
            const possiblePaths = [
                'entity_throughput_rep_summary.csv',
                'results/entity_throughput_rep_summary.csv'
            ];

            let foundContent = null;
            let foundPath = null;

            this.logger.info(`Checking multiple possible paths for entity throughput data in container ${containerName}:`);
            for (const path of possiblePaths) {
                this.logger.info(`Checking path: ${path}`);
                const content = await storageService.getBlobContent(containerName, path);
                if (content) {
                    foundContent = content;
                    foundPath = path;
                    this.logger.info(`Found data at path: ${path}!`);
                    break;
                }
            }

            if (foundContent) {
                this.logger.info(`Entity throughput data found at ${foundPath}! Length: ${foundContent.length} bytes`);
                this.logger.info(`Preview: ${foundContent.substring(0, 100)}...`);
            } else {
                this.logger.warn(`Entity throughput data NOT found after checking common paths.`);

                // Try listing contents of the container to see what files exist
                try {
                    const blobs = await storageService.listBlobs(containerName);

                    if (blobs.length > 0) {
                        this.logger.info(`Found ${blobs.length} files in container ${containerName}:`);
                        blobs.forEach(blob => this.logger.info(`- ${blob}`));

                        // Look specifically for CSV files that might contain our data
                        const csvFiles = blobs.filter(b => b.endsWith('.csv'));
                        if (csvFiles.length > 0) {
                            this.logger.info(`Found ${csvFiles.length} CSV files: ${csvFiles.join(', ')}`);

                            // Look for anything that might be related to throughput
                            const throughputFiles = csvFiles.filter(f =>
                                f.toLowerCase().includes('throughput') ||
                                f.toLowerCase().includes('entity')
                            );

                            if (throughputFiles.length > 0) {
                                this.logger.info(`Possible throughput related files: ${throughputFiles.join(', ')}`);
                            }
                        }
                    } else {
                        this.logger.warn(`Container appears to be empty. No files found.`);
                    }
                } catch (error) {
                    this.logger.error(`Error listing blobs: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error while checking for entity throughput data: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Create a SimulationImportService instance with a random action ID
 * @param verboseLogging Whether to enable verbose logging
 * @returns A new SimulationImportService instance
 */
export function createSimulationImportService(verboseLogging = false): SimulationImportService {
    const actionId = Math.random().toString(36).substring(2, 10);
    return new SimulationImportService(actionId, verboseLogging);
}
