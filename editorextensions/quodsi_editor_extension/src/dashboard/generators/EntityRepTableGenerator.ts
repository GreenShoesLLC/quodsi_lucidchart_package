import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { EntityRep } from '../../data_sources/simulation_results/models';
import { EntityRepSchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Entity Replication tables
 */
export class EntityRepTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'entityRep';
    }
    
    /**
     * Returns the schema mapping for entity replication data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: EntityRepSchema,
            identifierFields: ['id', 'entity_id', 'entity_name'],
            percentageFields: [
                'percent_waiting', 
                'percent_blocked', 
                'percent_operation',
                'percent_connecting'
            ],
            priorityFields: [
                'entity_id',
                'entity_name',
                'scenario_name',
                'rep',
                'entity_count',
                'completed_count',
                'in_progress_count',
                'throughput_rate',
                'first_exit',
                'last_exit',
                'avg_time_in_system',
                'avg_time_waiting',
                'avg_time_blocked',
                'avg_time_in_operation',
                'percent_waiting',
                'percent_blocked',
                'percent_operation',
                'percent_connecting'
            ]
        };
    }
    
    /**
     * Retrieves entity replication data from the results reader
     */
    async getData(): Promise<EntityRep[]> {
        return this.resultsReader.getEntityRepData();
    }
    
    /**
     * Returns the default title for entity replication tables
     */
    getDefaultTitle(): string {
        return 'Entity Replication Summary';
    }
}