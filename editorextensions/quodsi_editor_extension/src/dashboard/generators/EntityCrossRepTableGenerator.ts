import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { EntityCrossRep } from '../../data_sources/simulation_results/models';
import { EntityCrossRepSchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Entity Cross Replication tables
 */
export class EntityCrossRepTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'entityCrossRep';
    }
    
    /**
     * Returns the schema mapping for entity cross replication data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: EntityCrossRepSchema,
            identifierFields: ['id', 'entity_id', 'entity_name'],
            percentageFields: [
                'percent_resource_wait_mean',
                'percent_queue_wait_mean',
                'percent_operation_mean',
                'percent_connecting_mean'
            ],
            priorityFields: [
                'entity_id',
                'entity_name',
                'scenario_name',
                'created_mean',
                'completed_count_mean',
                'in_progress_count_mean',
                'throughput_rate_mean',
                'time_in_system_mean',
                'time_resource_wait_mean',
                'time_queue_wait_mean',
                'time_in_operation_mean',
                'percent_resource_wait_mean',
                'percent_queue_wait_mean',
                'percent_operation_mean',
                'percent_connecting_mean'
            ]
        };
    }
    
    /**
     * Retrieves entity cross replication data from the results reader
     */
    async getData(): Promise<EntityCrossRep[]> {
        return this.resultsReader.getEntityCrossRepData();
    }
    
    /**
     * Returns the default title for entity cross replication tables
     */
    getDefaultTitle(): string {
        return 'Entity Cross Replication Summary';
    }
}