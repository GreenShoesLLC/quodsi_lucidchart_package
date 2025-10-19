import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { AzureStorageService } from "../services/azureStorageService";
import { RunState } from "../types/documentStatus";
import { ActionLogger } from "../utils/logging";
import { LoggingLevel } from "../utils/loggingLevels";

export const getDocumentStatusAction = async (
  action: DataConnectorAsynchronousAction
) => {
  const config = getConfig();
  const loggingLevel = config.logging?.pollActionLoggingLevel || LoggingLevel.MINIMAL;
  const logger = new ActionLogger('[GetDocumentStatusAction]', loggingLevel);

  try {
    logger.debug("Getting document status");

    const data = action.data as { documentId: string; scenarioId: string };

    if (!data.documentId) {
      logger.error("Missing documentId");
      return {
        success: false,
        error: "documentId is required"
      };
    }

    if (!data.scenarioId) {
      logger.error("Missing scenarioId");
      return {
        success: false,
        error: "scenarioId is required"
      };
    }

    const storageService = new AzureStorageService(
      config.azureStorageConnectionString
    );

    // Check if container exists
    const hasContainer = await storageService.containerExists(data.documentId);

    if (!hasContainer) {
      logger.debug(`Container ${data.documentId} does not exist`);
      return {
        success: true,
        hasContainer: false,
        scenario: null,
        statusDateTime: new Date().toISOString()
      };
    }

    // Get status.json from scenario folder
    const scenariosJson = await storageService.getBlobContent(
      data.documentId,
      `${data.scenarioId}/status.json`
    );

    let scenario = null;

    if (scenariosJson) {
      try {
        const parsedData = JSON.parse(scenariosJson);
        scenario = {
          id: parsedData.id,
          name: parsedData.name,
          runState: parsedData.runState as RunState,
          reps: parsedData.reps,
          forecastDays: parsedData.forecastDays,
          seed: parsedData.seed,
          type: parsedData.type,
          resultsLastUpdated: parsedData.resultsLastUpdated || null,
          resultsLastImported: parsedData.resultsLastImported || null,
          resultsViewed: typeof parsedData.resultsViewed === 'boolean' ? parsedData.resultsViewed : false,
          lastUpdated: parsedData.lastUpdated || new Date().toISOString()
        };

        logger.debug(`Found scenario: ${scenario.id}`);
      } catch (parseError) {
        logger.error(`Error parsing scenario JSON: ${parseError.message}`);
      }
    }

    return {
      success: true,
      hasContainer,
      scenario,
      statusDateTime: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Error in GetDocumentStatusAction: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};
