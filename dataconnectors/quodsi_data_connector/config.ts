// src/config.ts
export interface QuodsiConfig {
    apiBaseUrl: string;
}

// Use process.env values that are replaced during build time
const config: QuodsiConfig = {
    apiBaseUrl: process.env.QUODSI_API_URL || 'http://localhost:5000/api/'
};

export function getConfig(): QuodsiConfig {
    return config;
}