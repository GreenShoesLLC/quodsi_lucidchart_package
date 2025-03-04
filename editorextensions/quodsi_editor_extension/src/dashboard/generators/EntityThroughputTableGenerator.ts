import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { EntityThroughputRepSummary } from '../../data_sources/simulation_results/models';
import { EntityThroughputRepSummarySchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Entity Throughput tables
 */
export class EntityThroughputTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'entity_throughput_rep_summary';
    }
    
    /**
     * Returns the schema mapping for entity throughput data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: EntityThroughputRepSummarySchema,
            identifierFields: ['rep', 'entity_type'],
            percentageFields: [],
            priorityFields: ['entity_type', 'rep', 'throughput_rate', 'completed_count', 'count']
        };
    }
    
    /**
     * Retrieves entity throughput data from the results reader
     */
    async getData(): Promise<EntityThroughputRepSummary[]> {
        return this.resultsReader.getEntityThroughputRepSummaryData();
    }
    
    /**
     * Returns the default title for entity throughput tables
     */
    getDefaultTitle(): string {
        return 'Entity Throughput';
    }
}