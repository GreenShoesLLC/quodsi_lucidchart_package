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
            percentageFields: ['capacity_utilization_mean', 'capacity_utilization_max', 'active_time_pct_mean', 'active_time_pct_min', 'active_time_pct_max', 'active_time_pct_std_dev'],
            priorityFields: [
                'activity_id',
                'activity_name',
                'scenario_name',
                'capacity_utilization_mean',
                'capacity_utilization_max',
                'capacity_utilization_std_dev',
                'capacity_mean',
                'capacity_max',
                'avg_number_allocated_mean',
                'avg_number_allocated_max',
                'cycle_time_mean',
                'total_time_waiting_for_resource_mean',
                'total_time_blocked_mean',
                'total_arrivals_mean',
                'total_allocations_mean',
                'throughput_mean',
                'total_cost_mean'
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