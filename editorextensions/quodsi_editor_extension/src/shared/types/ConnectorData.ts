/**
 * Extended connector data for storage and conversion
 */
export interface ConnectorData {
    id: string;
    name: string;
    sourceId: string;
    targetId: string;
    probability: number;
    routing: {
        type: string;
        conditions: any[];
    };
}