import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { ActivityUtilization } from '../../data_sources/simulation_results/models';
import { ActivityUtilizationSchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Activity Utilization tables
 */
export class ActivityUtilizationTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'activityUtilization';
    }
    
    /**
     * Returns the schema mapping for activity utilization data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: ActivityUtilizationSchema,
            identifierFields: ['id', 'activity_id', 'activity_name'],
            percentageFields: ['utilization_mean', 'utilization_max', 'utilization_std_dev'],
            priorityFields: [
                'activity_name',
                'scenario_name',
                'activity_id',
                'utilization_mean',
                'utilization_max',
                'utilization_std_dev',
                'capacity_mean',
                'capacity_max',
                'capacity_std_dev',
                'contents_mean',
                'contents_max',
                'contents_std_dev',
                'queue_length_mean',
                'queue_length_max',
                'queue_length_std_dev'
            ]
        };
    }
    
    /**
     * Retrieves activity utilization data from the results reader
     */
    async getData(): Promise<ActivityUtilization[]> {
        return this.resultsReader.getActivityUtilizationData();
    }
    
    /**
     * Returns the default title for activity utilization tables
     */
    getDefaultTitle(): string {
        return 'Activity Utilization';
    }
}