/**
 * Result of page conversion
 */
export interface ConversionResult {
    success: boolean;
    modelId: string;
    elementCount: {
        activities: number;
        generators: number;
        resources: number;
        connectors: number;
    };
}