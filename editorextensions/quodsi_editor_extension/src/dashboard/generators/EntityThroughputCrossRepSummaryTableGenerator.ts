import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { EntityThroughputCrossRepSummary } from '../../data_sources/simulation_results/models';
import { EntityThroughputCrossRepSummarySchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Entity Throughput Cross Replication Summary tables
 */
export class EntityThroughputCrossRepSummaryTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'entityThroughputCrossRepSummary';
    }
    
    /**
     * Returns the schema mapping for entity throughput cross replication data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: EntityThroughputCrossRepSummarySchema,
            identifierFields: ['id', 'entity_id', 'entity_name'],
            percentageFields: [],
            priorityFields: [
                'entity_name',
                'scenario_name',
                'count_mean',
                'count_median', 
                'count_std_dev',
                'completed_count_mean',
                'completed_count_median',
                'completed_count_std_dev',
                'in_progress_count_mean',
                'in_progress_count_median',
                'in_progress_count_std_dev',
                'throughput_rate_mean',
                'throughput_rate_median',
                'throughput_rate_std_dev',
                'throughput_rate_cv',
                'interval_mean',
                'interval_median',
                'interval_std_dev',
                'interval_cv',
                'first_exit_mean',
                'first_exit_median',
                'first_exit_std_dev',
                'last_exit_mean',
                'last_exit_median',
                'last_exit_std_dev'
            ]
        };
    }
    
    /**
     * Retrieves entity throughput cross replication data from the results reader
     */
    async getData(): Promise<EntityThroughputCrossRepSummary[]> {
        console.log('[DEBUG] EntityThroughputCrossRepSummaryTableGenerator.getData() called');
        const data = await this.resultsReader.getEntityThroughputCrossRepSummaryData();
        console.log('[DEBUG] EntityThroughputCrossRepSummaryTableGenerator received data count:', data.length);
        if (data.length > 0) {
            console.log('[DEBUG] EntityThroughputCrossRepSummaryTableGenerator first item:', JSON.stringify(data[0]));
        }
        return data;
    }
    
    /**
     * Returns the default title for entity throughput cross replication tables
     */
    getDefaultTitle(): string {
        return 'Entity Throughput Cross Replication Analysis';
    }
}