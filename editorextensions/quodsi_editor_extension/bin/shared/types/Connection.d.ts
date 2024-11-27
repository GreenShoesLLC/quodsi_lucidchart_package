/**
 * Represents a connection between elements in the simulation
 */
export interface Connection {
    id: string;
    sourceId: string;
    targetId: string;
    probability: number;
}
