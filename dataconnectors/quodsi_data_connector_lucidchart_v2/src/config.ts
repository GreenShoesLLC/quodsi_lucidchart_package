// Environment detection and configuration
import { LoggingLevel, parseLoggingLevel } from "./utils/loggingLevels";

export type Environment = 'dev' | 'tst' | 'prd' | 'local';

/**
 * Maximum number of simulation runs allowed per document
 * This limit ensures reasonable Azure Storage usage and good UX
 */
export const MAX_SIMULATION_RUNS = 5;

export function detectEnvironment(): Environment {
  // When running in Azure, use the Function App name to detect environment
  const functionAppName = process.env.WEBSITE_SITE_NAME || '';
  
  if (functionAppName.startsWith('dev-')) {
    return 'dev';
  } else if (functionAppName.startsWith('tst-')) {
    return 'tst';
  } else if (functionAppName.startsWith('prd-')) {
    return 'prd';
  }
  
  // Default to local environment if not running in Azure or can't detect
  return 'local';
}

export interface LoggingConfig {
  baseLoggingLevel: LoggingLevel; // Default level for all components
  pollActionLoggingLevel: LoggingLevel; // Level for poll action
  hardRefreshActionLoggingLevel: LoggingLevel; // Level for hard refresh action
  storageServiceLoggingLevel: LoggingLevel; // Level for storage service
  simulationServiceLoggingLevel: LoggingLevel; // Level for simulation service
}

export interface QuodsiConfig {
  apiBaseUrl: string;
  batchAccountName: string;
  batchAccountKey: string;
  batchAccountUrl: string;
  azureStorageConnectionString: string;
  simulationResultsContainer: string;
  batchPoolId: string;
  defaultApplicationId?: string;
  defaultAppVersion?: string;
  logLevel: string;
  environment: Environment;
  
  // Add logging configuration
  logging: LoggingConfig;
}

/**
 * Default logging configuration based on environment
 */
function getDefaultLoggingConfig(env: Environment): LoggingConfig {
  // Production uses minimal logging to reduce noise
  if (env === 'prd') {
    return {
      baseLoggingLevel: LoggingLevel.MINIMAL,
      pollActionLoggingLevel: LoggingLevel.ERROR, // Only log errors for automatic poll actions
      hardRefreshActionLoggingLevel: LoggingLevel.MINIMAL, // Minimal logging for user-initiated actions
      storageServiceLoggingLevel: LoggingLevel.ERROR, // Only errors for storage service
      simulationServiceLoggingLevel: LoggingLevel.ERROR // Only errors for simulation service
    };
  }
  
  // Test environment uses normal logging
  if (env === 'tst') {
    return {
      baseLoggingLevel: LoggingLevel.NORMAL,
      pollActionLoggingLevel: LoggingLevel.MINIMAL,
      hardRefreshActionLoggingLevel: LoggingLevel.NORMAL,
      storageServiceLoggingLevel: LoggingLevel.MINIMAL,
      simulationServiceLoggingLevel: LoggingLevel.NORMAL
    };
  }
  
  // Dev and local environments use more verbose logging
  return {
    baseLoggingLevel: LoggingLevel.NORMAL,
    pollActionLoggingLevel: LoggingLevel.NORMAL,
    hardRefreshActionLoggingLevel: LoggingLevel.VERBOSE, // Full details for user-initiated actions
    storageServiceLoggingLevel: LoggingLevel.NORMAL,
    simulationServiceLoggingLevel: LoggingLevel.NORMAL
  };
}

function getEnvironmentSpecificConfig(env: Environment): Partial<QuodsiConfig> {
  // Environment-specific configurations
  // Note: Pool and application settings are now managed via environment variables
  // set by the Azure Function App deployment (see ARM template)
  const envConfigs: Record<Environment, Partial<QuodsiConfig>> = {
    'dev': {
      azureStorageConnectionString: process.env.AzureStorageConnectionString || 'DefaultEndpointsProtocol=https;AccountName=devquodsist01;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net',
    },
    'tst': {
      azureStorageConnectionString: process.env.AzureStorageConnectionString || 'DefaultEndpointsProtocol=https;AccountName=tstquodsist01;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net',
    },
    'prd': {
      azureStorageConnectionString: process.env.AzureStorageConnectionString || 'DefaultEndpointsProtocol=https;AccountName=prdquodsist01;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net',
    },
    'local': {
      // Local development will use whatever is in the environment variables
      // or the defaults defined in the main config
    }
  };

  return envConfigs[env];
}

// Parse environment variables related to logging
function getLoggingConfigFromEnv(environment: Environment): LoggingConfig {
  // Start with defaults for the environment
  const defaultConfig = getDefaultLoggingConfig(environment);
  
  // Override with environment variables if provided
  return {
    baseLoggingLevel: parseLoggingLevel(process.env.LOG_LEVEL_BASE),
    pollActionLoggingLevel: parseLoggingLevel(process.env.LOG_LEVEL_POLL_ACTION) || defaultConfig.pollActionLoggingLevel,
    hardRefreshActionLoggingLevel: parseLoggingLevel(process.env.LOG_LEVEL_HARD_REFRESH) || defaultConfig.hardRefreshActionLoggingLevel,
    storageServiceLoggingLevel: parseLoggingLevel(process.env.LOG_LEVEL_STORAGE) || defaultConfig.storageServiceLoggingLevel,
    simulationServiceLoggingLevel: parseLoggingLevel(process.env.LOG_LEVEL_SIMULATION) || defaultConfig.simulationServiceLoggingLevel
  };
}

const baseConfig: QuodsiConfig = {
  apiBaseUrl: process.env.QUODSI_API_URL || 'http://localhost:5000/api/',
  batchAccountName: process.env.BatchAccountName || 'quodsisharedbatch01',
  batchAccountKey: process.env.BatchAccountKey || '',
  batchAccountUrl: process.env.BatchAccountUrl || 'https://quodsisharedbatch01.eastus2.batch.azure.com',
  azureStorageConnectionString: process.env.AzureStorageConnectionString || '',
  simulationResultsContainer: process.env.SIMULATION_RESULTS_CONTAINER || 'simulation-results',
  batchPoolId: process.env.BatchPoolId || 'quodsi-dev-python-pool-01',
  defaultApplicationId: process.env.DefaultApplicationId || 'dev_quodsim',
  defaultAppVersion: process.env.DefaultAppVersion || '1.0',
  logLevel: process.env.LOG_LEVEL || 'info',
  environment: 'local',
  logging: getDefaultLoggingConfig('local') // Will be overridden with environment-specific settings
};

export function getConfig(): QuodsiConfig {
  // Detect the current environment
  const environment = detectEnvironment();
  
  // Get environment-specific configuration
  const envConfig = getEnvironmentSpecificConfig(environment);
  
  // Get logging configuration based on environment and env vars
  const loggingConfig = getLoggingConfigFromEnv(environment);
  
  // Merge base config with environment-specific config
  const mergedConfig: QuodsiConfig = {
    ...baseConfig,
    ...envConfig,
    environment,
    logging: loggingConfig
  };
  
  // Log the detected environment and key configuration properties (for debugging)
  console.log(`[CONFIG] Detected environment: ${environment}`);
  console.log(`[CONFIG] Using storage account: ${mergedConfig.azureStorageConnectionString.includes('AccountName=') ? 
    mergedConfig.azureStorageConnectionString.split('AccountName=')[1].split(';')[0] : 'unknown'}`);
  console.log(`[CONFIG] Using batch pool: ${mergedConfig.batchPoolId}`);
  console.log(`[CONFIG] Using application: ${mergedConfig.defaultApplicationId}`);
  console.log(`[CONFIG] Base logging level: ${LoggingLevel[mergedConfig.logging.baseLoggingLevel]}`);
  console.log(`[CONFIG] Poll action logging level: ${LoggingLevel[mergedConfig.logging.pollActionLoggingLevel]}`);
  
  return mergedConfig;
}