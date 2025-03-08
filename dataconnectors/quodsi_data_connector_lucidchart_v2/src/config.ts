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
    logLevel: string; // 'debug', 'info', 'warn', 'error', 'none'
}

const config: QuodsiConfig = {
    apiBaseUrl: process.env.QUODSI_API_URL || 'http://localhost:5000/api/',
    batchAccountName: process.env.BatchAccountName || '',
    batchAccountKey: process.env.BatchAccountKey || '',
    batchAccountUrl: process.env.BatchAccountUrl || '',
    azureStorageConnectionString: process.env.AzureStorageConnectionString || '',
    simulationResultsContainer: process.env.SIMULATION_RESULTS_CONTAINER || 'simulation-results',
    batchPoolId: process.env.BatchPoolId || 'quodsi-pool',
    defaultApplicationId: process.env.DefaultApplicationId || 'LucidQuodsim',
    defaultAppVersion: process.env.DefaultAppVersion,
    logLevel: process.env.LOG_LEVEL || 'info'
};

export function getConfig(): QuodsiConfig {
    return config;
}
