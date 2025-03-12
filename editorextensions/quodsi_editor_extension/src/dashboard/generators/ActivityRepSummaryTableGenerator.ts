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
        return 'activityRepSummary';
    }
    
    /**
     * Returns the schema mapping for activity replication summary data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: ActivityRepSummarySchema,
            identifierFields: ['id', 'activity_id', 'activity_name'],
            percentageFields: ['utilization_percentage', 'operational_efficiency', 'cycle_time_efficiency'],
            priorityFields: [
                'activity_id',
                'activity_name',
                'scenario_name',
                'rep',
                'utilization_percentage',
                'throughput_rate',
                'capacity',
                'total_available_clock',
                'total_requests',
                'total_captures',
                'average_contents',
                'maximum_contents',
                'current_contents',
                'average_time_per_entry',
                'average_queue_length'
            ]
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