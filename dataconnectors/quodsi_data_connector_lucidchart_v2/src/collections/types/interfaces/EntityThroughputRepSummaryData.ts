/**
 * Interface for Entity Throughput Replication Summary data
 * Defines entity throughput metrics across replications
 */
export interface EntityThroughputRepSummaryData {
    id?: string; // Optional since we'll generate it when processing the data
    rep: number;
    entity_type: string;
    count: number;
    completed_count: number;
    in_progress_count: number;
    throughput_rate: number;

    // Optional fields
    first_exit?: number;
    last_exit?: number;
    avg_interval?: number;
    min_interval?: number;
    max_interval?: number;
    
    // Allow for additional properties
    [key: string]: any;
}
