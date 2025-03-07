// actions/importSimulationResultsAction.ts - with console.log calls
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { setStorageVerboseLogging } from "../services/azureStorageService";
import { ActionLogger } from '../utils/logging';
import { getStorageService, initializeStorageService } from "../services/simulationData";
import { resetDataCollectionConfig, setDataCollectionConfig, updateModelData, updateSimulationResults } from "../services";

// Set to true to enable verbose logging for import action
const IMPORT_ACTION_VERBOSE_LOGGING = true;

export const importSimulationResultsAction = async (action: DataConnectorAsynchronousAction) => {
    // Create a simple ID for this action instance
    const actionId = Math.random().toString(36).substring(2, 10);
    const logger = new ActionLogger(`[Import:${actionId}]`, IMPORT_ACTION_VERBOSE_LOGGING);

    try {
        logger.info(`=== Import Simulation Results Action Started ===`);
        logger.info(`Action data:`, JSON.stringify(action.data, null, 2));

        // Set up verbose logging for all components
        setStorageVerboseLogging(IMPORT_ACTION_VERBOSE_LOGGING);

        // Get the data from action.data with required pageId
        const data = action.data as { documentId: string; userId: string; pageId: string; collectionsToImport?: string[] };
        if (!data.pageId) {
            throw new Error('pageId is required for import action');
        }

        logger.info(`Document ID: ${data.documentId}, User ID: ${data.userId}, Page ID: ${data.pageId}`);

        // Initialize Azure Storage Service
        const config = getConfig();
        logger.info(`Using Azure storage connection string: ${config.azureStorageConnectionString ? '(defined)' : '(undefined)'}`);

        // CRITICAL CHANGE: Use documentId as the container name instead of the fixed config value
        const containerName = data.documentId;
        logger.info(`Using documentId as container name: ${containerName}`);

        initializeStorageService(config.azureStorageConnectionString);

        // First, update the Models collection
        logger.info(`Updating model data...`);
        await updateModelData(action, data.documentId, data.userId, data.pageId, IMPORT_ACTION_VERBOSE_LOGGING, logger);
        logger.info(`Model data update completed successfully`);

        // Check if container exists before proceeding
        const storageService = getStorageService();
        const containerExists = await storageService.containerExists(containerName);
        logger.info(`Container "${containerName}" exists: ${containerExists}`);

        if (!containerExists) {
            logger.warn(`Container "${containerName}" not found with current connection string.`);

            // List available containers to diagnose the issue
            try {
                const availableContainers = await storageService.listContainers();
                if (availableContainers.length > 0) {
                    logger.info(`Available containers in storage account: ${availableContainers.join(', ')}`);

                    // Check if we can find the document ID in a different format
                    // Sometimes UUIDs may be stored without hyphens or with different casing
                    const normalizedDocId = data.documentId.toLowerCase().replace(/-/g, '');
                    const possibleMatches = availableContainers.filter(name => {
                        const normalizedName = name.toLowerCase().replace(/-/g, '');
                        return normalizedName === normalizedDocId ||
                            normalizedName.includes(normalizedDocId) ||
                            normalizedDocId.includes(normalizedName);
                    });

                    if (possibleMatches.length > 0) {
                        logger.info(`Found possible container matches: ${possibleMatches.join(', ')}`);
                        // Maybe try using the first match instead?
                        // containerName = possibleMatches[0];
                        // logger.info(`Trying alternative container: ${containerName}`);
                    }
                } else {
                    logger.warn(`No containers found in storage account. Check connection string.`);
                }
            } catch (error) {
                logger.error(`Error listing containers: ${error.message}`);
            }

            // If container doesn't exist, we really can't continue - no need to try updateSimulationResults
            logger.error(`Cannot continue: Container "${containerName}" does not exist`);
            return {
                success: false,
                error: `Container "${containerName}" does not exist`,
                modelUpdated: true
            };
        }

        // Configure which collections to import based on optional input parameter
        if (data.collectionsToImport) {
            logger.info(`Custom collection import configuration specified: ${data.collectionsToImport.join(', ')}`);

            // Start by disabling all collections
            setDataCollectionConfig({
                activityUtilization: false,
                activityRepSummary: false,
                activityTiming: false,
                entityStateRepSummary: false,
                entityThroughputRepSummary: false,
                resourceRepSummary: false,
                completeActivityMetrics: false,
                customMetrics: false
            });

            // Then enable only the specified collections
            const configUpdate: any = {};
            data.collectionsToImport.forEach(collection => {
                switch (collection) {
                    case 'activity_utilization':
                        configUpdate.activityUtilization = true;
                        break;
                    case 'activity_rep_summary':
                        configUpdate.activityRepSummary = true;
                        break;
                    case 'activity_timing':
                        configUpdate.activityTiming = true;
                        break;
                    case 'entity_state_rep_summary':
                        configUpdate.entityStateRepSummary = true;
                        break;
                    case 'entity_throughput_rep_summary':
                        configUpdate.entityThroughputRepSummary = true;
                        break;
                    case 'resource_rep_summary':
                        configUpdate.resourceRepSummary = true;
                        break;
                    case 'complete_activity_metrics':
                        configUpdate.completeActivityMetrics = true;
                        break;
                    case 'custom_metrics':
                        configUpdate.customMetrics = true;
                        break;
                    default:
                        logger.warn(`Unknown collection specified: ${collection}`);
                }
            });

            setDataCollectionConfig(configUpdate);
        } else {
            // If no specific collections are requested, reset to default (all enabled)
            resetDataCollectionConfig();
        }

        // Direct check for entity throughput data files
        try {
            // Now that we know documentId is the container name, we're looking at the root level
            // of the container for our CSV files, not in a subfolder named by documentId
            const possiblePaths = [
                'entity_throughput_rep_summary.csv',
                'results/entity_throughput_rep_summary.csv'
            ];

            let foundContent = null;
            let foundPath = null;

            logger.info(`Checking multiple possible paths for entity throughput data in container ${containerName}:`);
            for (const path of possiblePaths) {
                logger.info(`Checking path: ${path}`);
                const content = await storageService.getBlobContent(containerName, path);
                if (content) {
                    foundContent = content;
                    foundPath = path;
                    logger.info(`Found data at path: ${path}!`);
                    break;
                }
            }

            if (foundContent) {
                logger.info(`Entity throughput data found at ${foundPath}! Length: ${foundContent.length} bytes`);
                logger.info(`Preview: ${foundContent.substring(0, 100)}...`);
            } else {
                logger.warn(`Entity throughput data NOT found after checking common paths.`);

                // Try listing contents of the container to see what files exist
                try {
                    const blobs = await storageService.listBlobs(containerName);

                    if (blobs.length > 0) {
                        logger.info(`Found ${blobs.length} files in container ${containerName}:`);
                        blobs.forEach(blob => logger.info(`- ${blob}`));

                        // Look specifically for CSV files that might contain our data
                        const csvFiles = blobs.filter(b => b.endsWith('.csv'));
                        if (csvFiles.length > 0) {
                            logger.info(`Found ${csvFiles.length} CSV files: ${csvFiles.join(', ')}`);

                            // Look for anything that might be related to throughput
                            const throughputFiles = csvFiles.filter(f =>
                                f.toLowerCase().includes('throughput') ||
                                f.toLowerCase().includes('entity')
                            );

                            if (throughputFiles.length > 0) {
                                logger.info(`Possible throughput related files: ${throughputFiles.join(', ')}`);
                            }
                        }
                    } else {
                        logger.warn(`Container appears to be empty. No files found.`);
                    }
                } catch (error) {
                    logger.error(`Error listing blobs: ${error.message}`);
                }
            }
        } catch (error) {
            logger.error(`Error while checking for entity throughput data: ${error.message}`);
        }

        // CRITICAL CHANGE: Override the container name in config to use documentId
        // This is needed because updateSimulationResults uses config.simulationResultsContainer
        const originalContainer = config.simulationResultsContainer;
        (config as any).simulationResultsContainer = containerName;

        logger.info(`Temporarily overriding simulationResultsContainer config from "${originalContainer}" to "${containerName}"`);

        // Proceed with simulation results update
        logger.info(`Updating simulation results...`);
        const result = await updateSimulationResults(
            action,
            data.documentId,
            data.userId,
            'import',
            IMPORT_ACTION_VERBOSE_LOGGING,
            logger
        );

        // Restore original config value
        (config as any).simulationResultsContainer = originalContainer;
        logger.info(`Restored original container config value: "${originalContainer}"`);

        if (result.success) {
            logger.info(`=== Import Simulation Results Action Completed Successfully ===`);
        } else {
            logger.error(`=== Import Simulation Results Action Partially Completed with Errors ===`);
            // Fix for TypeScript error - check if 'error' property exists
            if ('error' in result) {
                logger.error(`Error in simulation results update: ${result.error}`);
            } else {
                logger.error(`Error in simulation results update: Unknown error`);
            }
        }

        // Even if simulation results update had issues, we still want to report overall success
        // since the model data was updated successfully
        return {
            ...result,
            success: true,  // Always return success if we at least updated the model
            modelUpdated: true
        };

    } catch (error) {
        logger.error(`=== Error in Import Simulation Results Action ===`);
        logger.error(`Error details:`, error);
        if (error instanceof Error) {
            logger.error(`Error name: ${error.name}`);
            logger.error(`Error message: ${error.message}`);
            logger.error(`Error stack: ${error.stack}`);
        }
        return { success: false };
    } finally {
        // Always reset to default configuration when done, so subsequent calls aren't affected
        resetDataCollectionConfig();
    }
};