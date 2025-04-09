import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { EntityStateCrossRepSummary } from '../../data_sources/simulation_results/models';
import { EntityStateCrossRepSummarySchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Entity State Cross Replication Summary tables
 */
export class EntityStateCrossRepSummaryTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'entityStateCrossRepSummary';
    }
    
    /**
     * Returns the schema mapping for entity state cross replication data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: EntityStateCrossRepSummarySchema,
            identifierFields: ['id', 'entity_id', 'entity_name'],
            percentageFields: [
                'percent_waiting_mean',
                'percent_waiting_std_dev',
                'percent_blocked_mean',
                'percent_blocked_std_dev',
                'percent_operation_mean',
                'percent_operation_std_dev',
                'percent_connecting_mean',
                'percent_connecting_std_dev'
            ],
            priorityFields: [
                'entity_name',
                'scenario_name',
                'count_mean',
                'count_median',
                'count_std_dev',
                'time_in_system_mean',
                'time_in_system_median',
                'time_in_system_std_dev',
                'time_waiting_mean',
                'time_waiting_median',
                'time_waiting_std_dev',
                'time_blocked_mean',
                'time_blocked_median',
                'time_blocked_std_dev',
                'time_in_operation_mean',
                'time_in_operation_median',
                'time_in_operation_std_dev',
                'time_connecting_mean',
                'time_connecting_median',
                'time_connecting_std_dev',
                'percent_waiting_mean',
                'percent_waiting_std_dev',
                'percent_blocked_mean',
                'percent_blocked_std_dev',
                'percent_operation_mean',
                'percent_operation_std_dev',
                'percent_connecting_mean',
                'percent_connecting_std_dev'
            ]
        };
    }
    
    /**
     * Retrieves entity state cross replication data from the results reader
     */
    async getData(): Promise<EntityStateCrossRepSummary[]> {
        console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableGenerator.getData() called');
        const data = await this.resultsReader.getEntityStateCrossRepSummaryData();
        console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableGenerator received data count:', data.length);
        if (data.length > 0) {
            console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableGenerator first item:', JSON.stringify(data[0]));
        }
        return data;
    }
    
    /**
     * Returns the default title for entity state cross replication tables
     */
    getDefaultTitle(): string {
        return 'Entity State Cross Replication Analysis';
    }
}