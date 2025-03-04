import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { ActivityRepSummary } from '../../data_sources/simulation_results/models';
import { ActivityRepSummarySchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Activity Replication Summary tables
 */
export class ActivityRepSummaryTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'activity_rep_summary';
    }
    
    /**
     * Returns the schema mapping for activity replication summary data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: ActivityRepSummarySchema,
            identifierFields: ['rep', 'activity_id'],
            percentageFields: ['utilization_percentage', 'operational_efficiency', 'cycle_time_efficiency'],
            priorityFields: ['rep', 'activity_id', 'utilization_percentage', 'throughput_rate', 'capacity']
        };
    }
    
    /**
     * Retrieves activity replication summary data from the results reader
     */
    async getData(): Promise<ActivityRepSummary[]> {
        return this.resultsReader.getActivityRepSummaryData();
    }
    
    /**
     * Returns the default title for activity replication summary tables
     */
    getDefaultTitle(): string {
        return 'Activity Replication Summary';
    }
}