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
        return 'activityTiming';
    }
    
    /**
     * Returns the schema mapping for activity timing data
     */
    getSchemaMapping(): SchemaMapping {
        // Log the schema mapping for debugging
        console.log('ActivityTimingTableGenerator.getSchemaMapping() called');
        
        const schemaMapping = {
            schema: ActivityTimingSchema,
            identifierFields: ['id', 'activity_id', 'activity_name'],
            percentageFields: [],
            priorityFields: [
                'activity_name',
                'scenario_name',
                'activity_id',
                'cycle_time_mean',
                'cycle_time_median',
                'cycle_time_cv',
                'cycle_time_std_dev',
                'service_time_mean',
                'service_time_median',
                'service_time_cv',
                'service_time_std_dev',
                'waiting_time_mean',
                'waiting_time_median',
                'waiting_time_cv',
                'waiting_time_std_dev',
                'blocked_time_mean',
                'blocked_time_median',
                'blocked_time_cv',
                'blocked_time_std_dev'
            ]
        };
        
        console.log('ActivityTimingTableGenerator schema mapping:', schemaMapping);
        return schemaMapping;
    }
    
    /**
     * Retrieves activity timing data from the results reader
     */
    async getData(): Promise<ActivityTiming[]> {
        console.log('ActivityTimingTableGenerator.getData() called');
        const data = await this.resultsReader.getActivityTimingData();
        console.log('ActivityTimingTableGenerator data retrieved:', data);
        return data;
    }
    
    /**
     * Returns the default title for activity timing tables
     */
    getDefaultTitle(): string {
        return 'Activity Timing Analysis';
    }
    
    /**
     * Override createTable to add debugging
     */
    public async createTable(
        page: any, 
        client: any, 
        config?: TableGenerationConfig
    ): Promise<any> {
        console.log('ActivityTimingTableGenerator.createTable() called with config:', config);
        
        // Merge config with instance config and defaults
        const tableConfig = { ...this.config, ...config };
        console.log('ActivityTimingTableGenerator final table config:', tableConfig);
        
        // Call the parent implementation
        return super.createTable(page, client, tableConfig);
    }
}