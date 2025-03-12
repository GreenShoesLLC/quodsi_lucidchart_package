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
        return 'entityThroughput';
    }
    
    /**
     * Returns the schema mapping for entity throughput data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: EntityThroughputRepSummarySchema,
            identifierFields: ['id', 'entity_id', 'entity_name'],
            percentageFields: [],
            priorityFields: [
                'entity_name',
                'scenario_name',
                'entity_id',
                'rep',
                'count',
                'completed_count',
                'in_progress_count',
                'throughput_rate'
            ]
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