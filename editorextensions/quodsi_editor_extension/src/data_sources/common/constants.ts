// Common constants for data sources

// Data source names
export const DATA_SOURCE_NAMES = {
    MODEL_DEFINITION: 'model_def',
    SIMULATION_RESULTS: 'simulation_results'
} as const;

// Collection names
export const MODEL_DEFINITION_COLLECTIONS = {
    MODEL_DEFINITIONS: 'model_definitions'
} as const;

// Helper constants
export const ID_SEPARATOR = '_';

// Helper functions
export const createModelId = (documentId: string, pageId: string): string => {
    return `${documentId}${ID_SEPARATOR}${pageId}`;
};

export const parseModelId = (modelId: string): { documentId: string, pageId: string } | null => {
    const parts = modelId.split(ID_SEPARATOR);
    if (parts.length !== 2) {
        return null;
    }
    return {
        documentId: parts[0],
        pageId: parts[1]
    };
};