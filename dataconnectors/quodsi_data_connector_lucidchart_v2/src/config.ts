// Environment detection and configuration
export type Environment = 'dev' | 'tst' | 'prd' | 'local';

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
}

function getEnvironmentSpecificConfig(env: Environment): Partial<QuodsiConfig> {
  // Environment-specific configurations
  const envConfigs: Record<Environment, Partial<QuodsiConfig>> = {
    'dev': {
      azureStorageConnectionString: process.env.AzureStorageConnectionString || 'DefaultEndpointsProtocol=https;AccountName=devquodsist01;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net',
      batchPoolId: 'quodsi-dev-python-pool-01',
      defaultApplicationId: 'dev_quodsim'
    },
    'tst': {
      azureStorageConnectionString: process.env.AzureStorageConnectionString || 'DefaultEndpointsProtocol=https;AccountName=tstquodsist01;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net',
      batchPoolId: 'quodsi-tst-python-pool-01',
      defaultApplicationId: 'tst_quodsim'
    },
    'prd': {
      azureStorageConnectionString: process.env.AzureStorageConnectionString || 'DefaultEndpointsProtocol=https;AccountName=prdquodsist01;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net',
      batchPoolId: 'quodsi-prd-python-pool-01',
      defaultApplicationId: 'prd_quodsim'
    },
    'local': {
      // Local development will use whatever is in the environment variables
      // or the defaults defined in the main config
    }
  };
  
  return envConfigs[env];
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
  environment: 'local'
};

export function getConfig(): QuodsiConfig {
  // Detect the current environment
  const environment = detectEnvironment();
  
  // Get environment-specific configuration
  const envConfig = getEnvironmentSpecificConfig(environment);
  
  // Merge base config with environment-specific config
  const mergedConfig: QuodsiConfig = {
    ...baseConfig,
    ...envConfig,
    environment
  };
  
  // Log the detected environment and key configuration properties (for debugging)
  console.log(`[CONFIG] Detected environment: ${environment}`);
  console.log(`[CONFIG] Using storage account: ${mergedConfig.azureStorageConnectionString.includes('AccountName=') ? 
    mergedConfig.azureStorageConnectionString.split('AccountName=')[1].split(';')[0] : 'unknown'}`);
  console.log(`[CONFIG] Using batch pool: ${mergedConfig.batchPoolId}`);
  console.log(`[CONFIG] Using application: ${mergedConfig.defaultApplicationId}`);
  
  return mergedConfig;
}