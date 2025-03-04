import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { ActivityTiming } from '../../data_sources/simulation_results/models';
import { ActivityTimingSchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Activity Timing tables
 */
export class ActivityTimingTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'activity_timing';
    }
    
    /**
     * Returns the schema mapping for activity timing data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: ActivityTimingSchema,
            identifierFields: ['Id', 'Name'],
            percentageFields: [],
            priorityFields: [
                'Name',
                'cycle_time_mean',
                'service_time_mean',
                'waiting_time_mean',
                'blocked_time_mean'
            ]
        };
    }
    
    /**
     * Retrieves activity timing data from the results reader
     */
    async getData(): Promise<ActivityTiming[]> {
        return this.resultsReader.getActivityTimingData();
    }
    
    /**
     * Returns the default title for activity timing tables
     */
    getDefaultTitle(): string {
        return 'Activity Timing';
    }
}