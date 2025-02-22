export interface QuodsiConfig {
    apiBaseUrl: string;
    batchAccountName: string;
    batchAccountKey: string;
    batchAccountUrl: string;
}

const config: QuodsiConfig = {
    apiBaseUrl: process.env.QUODSI_API_URL || 'http://localhost:5000/api/',
    batchAccountName: process.env.BATCH_ACCOUNT_NAME || '',
    batchAccountKey: process.env.BATCH_ACCOUNT_KEY || '',
    batchAccountUrl: process.env.BATCH_ACCOUNT_URL || ''
};

export function getConfig(): QuodsiConfig {
    return config;
}
