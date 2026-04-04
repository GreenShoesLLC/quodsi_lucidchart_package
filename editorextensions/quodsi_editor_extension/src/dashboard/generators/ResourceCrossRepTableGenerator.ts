import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { ResourceCrossRep } from '../../data_sources/simulation_results/models';
import { ResourceCrossRepSchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Resource Cross Replication tables
 */
export class ResourceCrossRepTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'resourceCrossRep';
    }
    
    /**
     * Returns the schema mapping for resource cross replication data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: ResourceCrossRepSchema,
            identifierFields: ['id', 'resource_id', 'resource_name'],
            percentageFields: ['capacity_utilization_mean', 'capacity_utilization_min', 'capacity_utilization_max', 'active_time_pct_mean', 'active_time_pct_min', 'active_time_pct_max'],
            priorityFields: [
                'resource_id',
                'resource_name',
                'scenario_name',
                'capacity_utilization_mean',
                'capacity_utilization_min',
                'capacity_utilization_max',
                'capacity_utilization_std_dev',
                'active_time_pct_mean',
                'active_time_pct_min',
                'active_time_pct_max',
                'active_time_pct_std_dev',
                'total_cost_mean'
            ]
        };
    }
    
    /**
     * Retrieves resource cross replication data from the results reader
     */
    async getData(): Promise<ResourceCrossRep[]> {
        return this.resultsReader.getResourceCrossRepData();
    }
    
    /**
     * Returns the default title for resource cross replication tables
     */
    getDefaultTitle(): string {
        return 'Resource Cross Replication Summary';
    }
}