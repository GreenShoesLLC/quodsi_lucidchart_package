import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { EntityStateRepSummary } from '../../data_sources/simulation_results/models';
import { EntityStateRepSummarySchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Entity State tables
 */
export class EntityStateTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'entityState';
    }
    
    /**
     * Returns the schema mapping for entity state data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: EntityStateRepSummarySchema,
            identifierFields: ['id', 'entity_id', 'entity_name'],
            percentageFields: [
                'percent_waiting',
                'percent_blocked',
                'percent_operation',
                'percent_connecting'
            ],
            priorityFields: [
                'entity_name',
                'scenario_name',
                'entity_id',
                'rep',
                'count',
                'avg_time_in_system',
                'avg_time_waiting',
                'avg_time_blocked',
                'avg_time_in_operation',
                'avg_time_connecting',
                'percent_waiting',
                'percent_blocked',
                'percent_operation',
                'percent_connecting'
            ]
        };
    }
    
    /**
     * Retrieves entity state data from the results reader
     */
    async getData(): Promise<EntityStateRepSummary[]> {
        return this.resultsReader.getEntityStateRepSummaryData();
    }
    
    /**
     * Returns the default title for entity state tables
     */
    getDefaultTitle(): string {
        return 'Entity State Analysis';
    }
}