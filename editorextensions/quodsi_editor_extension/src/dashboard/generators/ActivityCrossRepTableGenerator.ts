import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { ActivityCrossRep } from '../../data_sources/simulation_results/models';
import { ActivityCrossRepSchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Activity Cross Replication tables
 */
export class ActivityCrossRepTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'activityCrossRep';
    }
    
    /**
     * Returns the schema mapping for activity cross replication data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: ActivityCrossRepSchema,
            identifierFields: ['id', 'activity_id', 'activity_name'],
            percentageFields: ['utilization_mean', 'utilization_max'],
            priorityFields: [
                'activity_id',
                'activity_name',
                'scenario_name',
                'utilization_mean',
                'utilization_max',
                'utilization_std_dev',
                'capacity_mean',
                'capacity_max',
                'contents_mean',
                'contents_max',
                'queue_length_mean',
                'queue_length_max',
                'cycle_time_mean',
                'waiting_time_mean',
                'blocked_time_mean',
                'arrivals_mean',
                'captures_mean',
                'releases_mean'
            ]
        };
    }
    
    /**
     * Retrieves activity cross replication data from the results reader
     */
    async getData(): Promise<ActivityCrossRep[]> {
        return this.resultsReader.getActivityCrossRepData();
    }
    
    /**
     * Returns the default title for activity cross replication tables
     */
    getDefaultTitle(): string {
        return 'Activity Cross Replication Summary';
    }
}